import { prisma } from "@/lib/prisma"
import { generateAiText, generateAiTextStream, type GenerateAiTextInput, type GenerateAiTextResult } from "@/lib/ai"
import { moderatePrompt } from "@/lib/ai/moderation"
import { executeTool } from "@/lib/ai/tools"
import type { AiStreamEvent, AiWorkflowIntent, AiWorkflowState, ToolName, ToolResultPayload } from "@/lib/ai/types"
import { applyWorkflowPatch, type WorkflowMachineState } from "@/lib/ai/workflow-machine"
import { loadOrCreateWorkflowSession, persistWorkflowState } from "@/lib/ai/workflow-store"
import { templateOptions } from "@/components/shared/newsletter/template-data"

type OrchestratorInput = {
  userId: string
  userPlan?: string
  prompt: string
  conversationId?: string | null
  model?: string
  provider?: string
  system?: string
}

type PlannerDecision = {
  tool: ToolName
  args?: Record<string, unknown>
  state?: AiWorkflowState
  intent?: AiWorkflowIntent
  response?: string
}

function safeJsonParse<T>(raw: string): T | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")
  if (start < 0 || end <= start) return null
  const candidate = trimmed.slice(start, end + 1)

  try {
    return JSON.parse(candidate) as T
  } catch {
    return null
  }
}

function normalizeTool(value: string | undefined): ToolName {
  const candidate = String(value ?? "")
    .trim()
    .toLowerCase()
  if (candidate === "ask_campaign_type") return "ask_campaign_type"
  if (candidate === "suggest_templates") return "suggest_templates"
  if (candidate === "select_template") return "select_template"
  if (candidate === "request_recipients") return "request_recipients"
  if (candidate === "validate_recipients") return "validate_recipients"
  if (candidate === "review_campaign") return "review_campaign"
  if (candidate === "confirm_queue_campaign") return "confirm_queue_campaign"
  if (candidate === "compose_signature_email") return "compose_signature_email"
  return "compose_simple_email"
}

function inferFallbackDecision(state: WorkflowMachineState, prompt: string): PlannerDecision {
  const normalized = prompt.toLowerCase()
  const matchedTemplate = templateOptions.find((template) => normalized.includes(template.id))
  if (matchedTemplate) {
    return {
      tool: "select_template",
      args: { templateId: matchedTemplate.id },
      state: "TEMPLATE_SELECTED",
      intent: state.intent === "UNKNOWN" ? "NEWSLETTER" : state.intent,
    }
  }

  if (normalized.includes("@") || normalized.includes("csv")) {
    return {
      tool: "validate_recipients",
      args: { recipients: prompt },
      state: "VALIDATION_REVIEW",
    }
  }

  if (normalized.includes("send") || normalized.includes("launch")) {
    return {
      tool: "confirm_queue_campaign",
      state: "QUEUED",
    }
  }

  if (state.state === "INTENT_CAPTURE" || normalized.includes("newsletter")) {
    return {
      tool: "suggest_templates",
      args: { query: prompt },
      state: "TEMPLATE_DISCOVERY",
      intent: "NEWSLETTER",
    }
  }

  if (normalized.includes("signature")) {
    return {
      tool: "compose_signature_email",
      state: "COMPLETED",
      intent: "SIGNATURE",
    }
  }

  return {
    tool: "compose_simple_email",
    state: "COMPLETED",
    intent: state.intent === "UNKNOWN" ? "SIMPLE_EMAIL" : state.intent,
  }
}

function looksLikeGreetingOrShortIntent(prompt: string) {
  const normalized = prompt.trim().toLowerCase()
  if (!normalized) return true
  const greetings = new Set([
    "hi",
    "hello",
    "hey",
    "yo",
    "good morning",
    "good afternoon",
    "good evening",
    "ola",
    "olá",
    "bom dia",
    "boa tarde",
    "boa noite",
  ])
  if (greetings.has(normalized)) return true
  if (normalized.length <= 24 && !normalized.includes("email") && !normalized.includes("campaign")) return true
  return false
}

function buildPlannerPrompt(state: WorkflowMachineState, prompt: string) {
  const context = {
    state: state.state,
    intent: state.intent,
    selectedTemplateId: state.selectedTemplateId,
    recipientStats: state.recipientStats,
    context: state.context,
  }

  return [
    "Select exactly one tool and respond with strict JSON only.",
    'Schema: {"tool":"ask_campaign_type|suggest_templates|select_template|request_recipients|validate_recipients|review_campaign|confirm_queue_campaign|compose_simple_email|compose_signature_email","args":{},"state":"INTENT_CAPTURE|GOAL_BRIEF|TEMPLATE_DISCOVERY|TEMPLATE_SELECTED|CONTENT_REFINE|AUDIENCE_COLLECTION|VALIDATION_REVIEW|SEND_CONFIRMATION|QUEUED|COMPLETED","intent":"UNKNOWN|NEWSLETTER|SIMPLE_EMAIL|SIGNATURE","response":"short assistant response"}',
    "Rules: keep users on email workflows only. Newsletter path should prioritize template discovery and recipients before send. Be conversational and concise. Do not output full formal email templates unless user explicitly asks for drafting.",
    `Current workflow: ${JSON.stringify(context)}`,
    `User input: ${prompt}`,
  ].join("\n")
}

function mapToolToPatch(
  decision: PlannerDecision,
  current: WorkflowMachineState,
  result: ToolResultPayload,
): Partial<WorkflowMachineState> {
  const patch: Partial<WorkflowMachineState> = {}

  if (decision.state) patch.state = decision.state
  if (decision.intent) patch.intent = decision.intent
  if (result.selectedTemplateId) patch.selectedTemplateId = result.selectedTemplateId
  if (result.recipientStats) patch.recipientStats = result.recipientStats

  if (decision.tool === "request_recipients" && !patch.state) patch.state = "AUDIENCE_COLLECTION"
  if (decision.tool === "review_campaign" && !patch.state) patch.state = "SEND_CONFIRMATION"
  if (decision.tool === "confirm_queue_campaign" && !patch.state) patch.state = "QUEUED"
  if (decision.tool === "suggest_templates" && !patch.state) patch.state = "TEMPLATE_DISCOVERY"
  if (decision.tool === "select_template" && !patch.state) patch.state = "TEMPLATE_SELECTED"

  if (!patch.intent && current.intent === "UNKNOWN" && decision.tool === "suggest_templates") {
    patch.intent = "NEWSLETTER"
  }

  return patch
}

function getErrorCode(message: string) {
  if (message.includes("429")) return "RATE_LIMIT"
  if (message.includes("503")) return "SERVICE_UNAVAILABLE"
  if (message.toLowerCase().includes("quota")) return "QUOTA_EXCEEDED"
  return "UNKNOWN"
}

async function persistTelemetry(input: {
  requestId: string
  sessionId: string
  userId: string
  moderationAction: string
  result: GenerateAiTextResult | null
  error?: string
}) {
  if (!input.result && !input.error) return

  const attempts = input.result?.attempts?.length
    ? input.result.attempts
    : [
        {
          provider: input.result?.provider ?? "unknown",
          model: input.result?.model ?? "unknown",
          status: input.error ? "ERROR" : "SUCCESS",
          latencyMs: input.result?.latencyMs ?? null,
          tokenIn: input.result?.tokenIn ?? null,
          tokenOut: input.result?.tokenOut ?? null,
          estimatedCostUsd: input.result?.estimatedCostUsd ?? null,
          errorCode: input.error ? getErrorCode(input.error) : null,
        },
      ]

  await prisma.aiRequestTelemetry.createMany({
    data: attempts.map((attempt) => ({
      requestId: input.requestId,
      sessionId: input.sessionId,
      userId: input.userId,
      provider: attempt.provider,
      model: attempt.model,
      latencyMs: attempt.latencyMs ?? null,
      tokenIn: attempt.tokenIn ?? null,
      tokenOut: attempt.tokenOut ?? null,
      estimatedCostUsd: attempt.estimatedCostUsd ?? null,
      status: attempt.status,
      errorCode: attempt.errorCode ?? null,
      moderationAction: input.moderationAction,
    })),
  })
}

async function runPlannerAi(input: GenerateAiTextInput, state: WorkflowMachineState, prompt: string) {
  const planner = await generateAiText({
    ...input,
    temperature: 0.2,
    prompt: buildPlannerPrompt(state, prompt),
    system: "You are a strict workflow planner for Blastermailer AI.",
  })
  const parsed = safeJsonParse<PlannerDecision>(planner.text)
  if (!parsed) return { decision: inferFallbackDecision(state, prompt), planner }

  return {
    decision: {
      ...parsed,
      tool: normalizeTool(parsed.tool),
      args: parsed.args ?? {},
      state: parsed.state,
      intent: parsed.intent,
      response: parsed.response,
    } as PlannerDecision,
    planner,
  }
}

function chunkText(text: string) {
  return text.match(/.{1,20}/g) ?? [text]
}

export async function* orchestrateAiChatStream(input: OrchestratorInput): AsyncGenerator<AiStreamEvent> {
  const requestId = crypto.randomUUID()
  const moderation = moderatePrompt(input.prompt)
  const workflowSession = await loadOrCreateWorkflowSession({
    userId: input.userId,
    conversationId: input.conversationId ?? null,
  })

  yield {
    type: "session",
    requestId,
    conversationId: workflowSession.conversationId,
    state: workflowSession.state.state,
    intent: workflowSession.state.intent,
    resumed: workflowSession.resumed,
  }

  if (moderation.action === "rewrite_safety") {
    yield {
      type: "moderation",
      action: moderation.action,
      message: moderation.message,
    }
  }

  const aiInputBase: GenerateAiTextInput = {
    prompt: moderation.sanitizedPrompt,
    model: input.model,
    provider: input.provider,
    system: input.system,
    userId: input.userId,
    userPlan: input.userPlan,
  }

  let plannerResult: GenerateAiTextResult | null = null
  let decision: PlannerDecision
  try {
    const plannerOutput = await runPlannerAi(aiInputBase, workflowSession.state, moderation.sanitizedPrompt)
    plannerResult = plannerOutput.planner
    decision = plannerOutput.decision
  } catch {
    decision = inferFallbackDecision(workflowSession.state, moderation.sanitizedPrompt)
  }

  if (workflowSession.state.state === "INTENT_CAPTURE" && looksLikeGreetingOrShortIntent(moderation.sanitizedPrompt)) {
    decision = {
      tool: "ask_campaign_type",
      state: "GOAL_BRIEF",
      intent: workflowSession.state.intent === "UNKNOWN" ? "UNKNOWN" : workflowSession.state.intent,
      response:
        "Great to see you. What are you trying to send today: newsletter, promotion, product update, or a one-off email?",
    }
  }

  const tool = normalizeTool(decision.tool)
  const args = decision.args ?? {}
  yield {
    type: "tool_start",
    tool,
    args,
  }

  const toolResult = executeTool({
    tool,
    args,
    context: workflowSession.state.context,
    selectedTemplateId: workflowSession.state.selectedTemplateId,
  })

  yield {
    type: "tool_result",
    tool,
    result: toolResult,
  }

  const toolPatch = mapToolToPatch(decision, workflowSession.state, toolResult)
  const patched = applyWorkflowPatch(workflowSession.state, {
    state: toolPatch.state ?? decision.state,
    intent: toolPatch.intent ?? decision.intent,
    selectedTemplateId: toolResult.selectedTemplateId ?? workflowSession.state.selectedTemplateId,
    recipientStats: toolResult.recipientStats ?? workflowSession.state.recipientStats,
    summary: toolResult.text ?? workflowSession.state.summary,
    context: {
      goal: workflowSession.state.context.goal ?? moderation.sanitizedPrompt,
    },
  })

  const persisted = await persistWorkflowState({
    sessionId: workflowSession.id,
    state: patched,
    checkpointPayload: {
      tool,
      args,
      toolResult,
    },
  })

  yield {
    type: "state_patch",
    state: persisted.state.state,
    intent: persisted.state.intent,
    selectedTemplateId: persisted.state.selectedTemplateId,
    recipientStats: persisted.state.recipientStats,
  }

  const shouldUseToolTextOnly =
    tool === "ask_campaign_type" ||
    tool === "suggest_templates" ||
    tool === "request_recipients" ||
    tool === "confirm_queue_campaign"

  let responseResult: GenerateAiTextResult | null = null
  let finalText = decision.response?.trim() || ""

  if (shouldUseToolTextOnly) {
    if (!finalText) {
      finalText = toolResult.text ?? "Done."
    }
    for (const token of chunkText(finalText)) {
      yield { type: "token", token }
    }
  } else {
    try {
      let streamedText = ""
      for await (const chunk of generateAiTextStream({
        ...aiInputBase,
        prompt: [
          `User prompt: ${moderation.sanitizedPrompt}`,
          `Tool result: ${JSON.stringify(toolResult)}`,
          `State: ${persisted.state.state}`,
          "Provide the final assistant response.",
        ].join("\n"),
      })) {
        if (chunk.type === "token") {
          streamedText += chunk.token
          yield { type: "token", token: chunk.token }
          continue
        }
        responseResult = {
          text: chunk.text,
          model: chunk.model,
          provider: chunk.provider,
          attempts: chunk.attempts,
          tokenIn: null,
          tokenOut: null,
          latencyMs: null,
          estimatedCostUsd: null,
        }
      }

      if (streamedText.trim()) {
        finalText = streamedText.trim()
      } else if (responseResult?.text) {
        finalText = responseResult.text
      }
    } catch {
      responseResult = await generateAiText({
        ...aiInputBase,
        prompt: [
          `User prompt: ${moderation.sanitizedPrompt}`,
          `Selected tool: ${tool}`,
          `Tool result: ${JSON.stringify(toolResult)}`,
          `Current workflow state: ${persisted.state.state}`,
          "Write a concise assistant response and keep focus on email campaign execution.",
        ].join("\n"),
      })
      finalText = responseResult.text
      for (const token of chunkText(finalText)) {
        yield { type: "token", token }
      }
    }
  }

  if (!finalText) {
    finalText = toolResult.text ?? "Done."
  }

  await persistTelemetry({
    requestId,
    sessionId: persisted.id,
    userId: input.userId,
    moderationAction: moderation.action,
    result: plannerResult,
  })
  await persistTelemetry({
    requestId,
    sessionId: persisted.id,
    userId: input.userId,
    moderationAction: moderation.action,
    result: responseResult,
  })

  yield {
    type: "done",
    requestId,
    conversationId: persisted.conversationId,
    state: persisted.state.state,
    intent: persisted.state.intent,
    text: finalText,
    selectedTemplateId: persisted.state.selectedTemplateId,
    templateSuggestions: toolResult.templateSuggestions,
    recipientStats: persisted.state.recipientStats,
    campaignId: toolResult.campaignId ?? null,
  }
}
