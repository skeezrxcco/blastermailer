import { prisma } from "@/lib/prisma"
import { assertMinimumCredits, consumeAiCredits, estimateCreditCost, isBudgetExhausted } from "@/lib/ai/credits"
import { resolveAiModelProfile, type AiModelMode } from "@/lib/ai/model-mode"
import { usdToEur } from "@/lib/ai/model-registry"
import { generateAiText, generateAiTextStream, type GenerateAiTextInput, type GenerateAiTextResult } from "@/lib/ai"
import { moderatePrompt } from "@/lib/ai/moderation"
import { executeTool } from "@/lib/ai/tools"
import type { AiStreamEvent, AiWorkflowIntent, AiWorkflowState, ToolName, ToolResultPayload } from "@/lib/ai/types"
import { applyWorkflowPatch, type WorkflowMachineState } from "@/lib/ai/workflow-machine"
import { loadOrCreateWorkflowSession, persistWorkflowState } from "@/lib/ai/workflow-store"
import { templateOptions } from "@/components/shared/newsletter/template-data"
import { routeToAgent, getAgentProfile, buildSkillsDescription } from "@/lib/ai/agents"
import {
  normalizeTemplateVariables,
  renderEmailTemplateFromHbs,
  resolveTemplateIdFromPrompt,
  type TemplateRenderVariables,
} from "@/lib/email-template-hbs"

type OrchestratorInput = {
  userId: string
  userPlan?: string
  prompt: string
  conversationId?: string | null
  /** Quality mode: fast | boost | max */
  qualityMode?: string | null
  /** Specific model registry ID within the quality mode */
  specificModel?: string | null
  /** @deprecated Use qualityMode instead */
  mode?: AiModelMode
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
  if (candidate === "generate_hbs_template") return "generate_hbs_template"
  return "compose_simple_email"
}

function inferFallbackDecision(state: WorkflowMachineState, prompt: string): PlannerDecision {
  const normalized = prompt.toLowerCase()

  // Signature detection — highest priority, checked first
  if (normalized.includes("signature")) {
    return {
      tool: "compose_signature_email",
      state: "COMPLETED",
      intent: "SIGNATURE",
    }
  }

  // HBS / Handlebars template generation
  if (normalized.includes("hbs") || normalized.includes("handlebars") || normalized.includes("template") && normalized.includes("generate")) {
    return {
      tool: "generate_hbs_template",
      state: "COMPLETED",
      intent: "NEWSLETTER",
    }
  }

  // Simple/one-off email
  if (
    (normalized.includes("simple") || normalized.includes("quick") || normalized.includes("one-off") || normalized.includes("draft")) &&
    normalized.includes("email")
  ) {
    return {
      tool: "compose_simple_email",
      state: "COMPLETED",
      intent: "SIMPLE_EMAIL",
    }
  }

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

  if (normalized.includes("send") || normalized.includes("launch") || normalized.includes("queue")) {
    const validRecipients = state.recipientStats?.valid ?? 0
    if (validRecipients <= 0) {
      return {
        tool: "request_recipients",
        state: "AUDIENCE_COLLECTION",
      }
    }
    return {
      tool: "confirm_queue_campaign",
      state: "QUEUED",
    }
  }

  // Detect intent but NEVER auto-suggest templates from fallback.
  // The planner should decide when templates are appropriate after understanding the user's needs.
  const newsletterKeywords = [
    "newsletter", "campaign", "promo", "promotion",
    "announcement", "welcome", "onboarding", "blast", "outreach",
    "retention", "reactivation", "winback", "win-back", "upsell",
    "cross-sell", "event", "webinar", "sale",
  ]
  const hasNewsletterIntent = newsletterKeywords.some((kw) => normalized.includes(kw))

  return {
    tool: "ask_campaign_type",
    state: "GOAL_BRIEF",
    intent: hasNewsletterIntent ? "NEWSLETTER" : (state.intent === "UNKNOWN" ? "UNKNOWN" : state.intent),
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
  if (normalized === "help" || normalized === "start") return true
  if (normalized.startsWith("can you help")) return true
  if (normalized.startsWith("i need help")) return true
  return false
}

function isLikelyIncoherentPrompt(prompt: string) {
  const normalized = prompt.trim().toLowerCase()
  if (!normalized) return false
  if (looksLikeGreetingOrShortIntent(normalized)) return false

  const compact = normalized.replace(/\s+/g, "")
  if (compact.length <= 2) return true
  if (!/[a-z]/.test(compact)) return true

  const vowelCount = (compact.match(/[aeiou]/g) ?? []).length
  const uniqueChars = new Set(compact).size
  const singleToken = normalized.split(/\s+/).filter(Boolean).length === 1

  if (singleToken && compact.length <= 5 && vowelCount === 0) return true
  if (singleToken && compact.length >= 4 && uniqueChars <= 2) return true
  if (/^[a-z]{3,6}$/.test(compact) && vowelCount === 0) return true

  return false
}

function buildIncoherentPromptResponse(turn: number) {
  if (turn <= 1) {
    return "I didn’t catch that. Tell me in one line what you want to send and what outcome you want."
  }
  return "I still can’t understand that input. Rephrase it as: campaign type + audience + goal."
}

function shouldCaptureGoalPrompt(prompt: string) {
  const normalized = prompt.trim()
  if (!normalized) return false
  if (looksLikeGreetingOrShortIntent(normalized)) return false
  if (isLikelyIncoherentPrompt(normalized)) return false
  return normalized.length >= 6
}

function buildPlannerPrompt(state: WorkflowMachineState, prompt: string, agentId?: import("@/lib/ai/agents").AgentId) {
  const context = {
    state: state.state,
    intent: state.intent,
    selectedTemplateId: state.selectedTemplateId,
    recipientStats: state.recipientStats,
    context: state.context,
  }

  // Resolve the active agent and its available skills
  const routing = routeToAgent(prompt, state.state)
  const effectiveAgentId = agentId ?? routing.agentId
  const agent = getAgentProfile(effectiveAgentId)
  const skillsList = buildSkillsDescription(agent.skills)

  return [
    `You are the "${agent.name}" agent for Blastermailer, an email campaign platform.`,
    agent.shortDescription,
    "",
    "Select exactly one skill to execute and respond with strict JSON only.",
    "",
    "JSON Schema:",
    '{"tool":"<skill_id>","args":{},"state":"<next_state>","intent":"<intent>","response":"<your conversational response to the user>"}',
    "",
    `## Your available skills`,
    skillsList,
    "",
    "States: INTENT_CAPTURE | GOAL_BRIEF | TEMPLATE_DISCOVERY | TEMPLATE_SELECTED | CONTENT_REFINE | AUDIENCE_COLLECTION | VALIDATION_REVIEW | SEND_CONFIRMATION | QUEUED | COMPLETED",
    "Intents: UNKNOWN | NEWSLETTER | SIMPLE_EMAIL | SIGNATURE",
    "",
    "## Intent Comprehension — CRITICAL",
    "Read the user's message carefully. Identify EXACTLY what they want:",
    "",
    "- 'signature' / 'sign-off' / 'email signature' → compose_signature_email (SIGNATURE)",
    "- 'write an email' / 'draft' / 'quick email' / 'one-off' → compose_simple_email (SIMPLE_EMAIL)",
    "- 'analyze' / 'research' / 'metrics' / 'performance' → use the appropriate analysis skill",
    "- 'budget' / 'cost' / 'roi' / 'pricing' → use the appropriate budget skill",
    "- 'send' / 'queue' / 'launch' → confirm_queue_campaign (QUEUED)",
    "- Greeting or unclear → ask_campaign_type — ask what they want (do NOT assume)",
    "",
    "## TEMPLATE vs CUSTOM GENERATION — CRITICAL",
    "Pre-built templates exist ONLY for: Food & Beverage (sushi, burger, vegan, fine dining), SaaS, Real Estate, Fitness, Travel, Healthcare, Education, E-commerce, Wellness.",
    "- suggest_templates: ONLY if the user's topic clearly matches a domain above (e.g. 'restaurant newsletter', 'fitness promo').",
    "- generate_hbs_template: For ANY topic NOT in the list (e.g. 'dogs', 'crypto', 'cars', 'pets', 'gaming'). This creates a beautiful custom template.",
    "- 'newsletter about dogs' → generate_hbs_template (NOT suggest_templates). Dogs is not a pre-built domain.",
    "- 'restaurant newsletter' → suggest_templates. Food & Beverage has pre-built templates.",
    "- When in doubt, use generate_hbs_template — custom templates always match the user's topic.",
    "",
    "## WORKFLOW PROGRESSION — CRITICAL",
    "- CONTENT_REFINE state: The user has a generated template. If they say 'yes', 'send', 'ready', 'ok', 'go ahead', 'add recipients' → use request_recipients to collect emails. Do NOT regenerate.",
    "- AUDIENCE_COLLECTION state: User provides emails → use validate_recipients.",
    "- VALIDATION_REVIEW state: Emails validated → use review_campaign.",
    "- SEND_CONFIRMATION state: User confirms → use confirm_queue_campaign.",
    "",
    "## Response Style",
    "- Be direct and conversational. No filler phrases.",
    "- If the user gives enough info (topic + type), generate immediately with generate_hbs_template.",
    "- If you need more info, ask ONE specific question, not a list.",
    "- Never use formal letter format or sign-offs.",
    "- Reference the user's exact words and situation.",
    "",
    "## DO NOT propose or generate too early",
    "- If the user just greeted you or said something vague, use 'ask_campaign_type'.",
    "- If the user says 'I want a newsletter' without a topic, ask what topic. ONE question only.",
    "- If the user says 'I want a newsletter about dogs', that IS enough — use generate_hbs_template immediately.",
    "- NEVER show suggest_templates for a topic that doesn't match the pre-built domains above.",
    "",
    "## SMTP and Sending Options",
    "When discussing sending, options are: Platform SMTP (default), custom SMTP, or dedicated SMTP purchase.",
    "",
    `Current workflow state: ${JSON.stringify(context)}`,
    `Active agent: ${agent.name} (${effectiveAgentId}) — confidence: ${routing.confidence.toFixed(2)}`,
    `User message: ${prompt}`,
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
  const routing = routeToAgent(prompt, state.state)
  const agent = getAgentProfile(routing.agentId)

  const planner = await generateAiText({
    ...input,
    temperature: Math.min(1, 0.5 + agent.temperatureBias * 0.3),
    maxOutputTokens: 800,
    prompt: buildPlannerPrompt(state, prompt, routing.agentId),
    system: [
      `You are the "${agent.name}" planner for Blastermailer.`,
      "",
      "You MUST output valid JSON only. No markdown, no explanation, just the JSON object.",
      "",
      "## CRITICAL RULES for the response field:",
      "- If the user gave you enough info to act, ACT IMMEDIATELY. Generate the email/signature/template NOW.",
      "- NEVER ask for info the user already provided. If they said their name and company, use it.",
      "- If the user confirms ('yes', 'ok', 'sure', 'go ahead', 'lets go'), PROCEED — don't ask more questions.",
      "- Ask at most ONE question per response. Never list multiple questions.",
      "- Keep the response to 1-2 sentences. Be concise, not verbose.",
      "- NEVER use filler like 'Great choice!', 'Absolutely!', 'I can help with that!'",
      "- Fill in reasonable defaults for any missing details rather than asking.",
    ].join("\n"),
  })
  const parsed = safeJsonParse<PlannerDecision>(planner.text)
  if (!parsed) return { decision: inferFallbackDecision(state, prompt), planner, routing }

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
    routing,
  }
}

function chunkText(text: string) {
  return text.match(/.{1,20}/g) ?? [text]
}

export async function* orchestrateAiChatStream(input: OrchestratorInput): AsyncGenerator<AiStreamEvent> {
  const requestId = crypto.randomUUID()
  const moderation = moderatePrompt(input.prompt)

  // Financial routing: check if Pro user has exceeded €12.50/month budget
  const budgetExhausted = await isBudgetExhausted({
    userId: input.userId,
    userPlan: input.userPlan,
  })

  const modelProfile = resolveAiModelProfile({
    mode: input.qualityMode ?? input.mode,
    userPlan: input.userPlan,
    specificModel: input.specificModel,
    budgetExhausted,
  })
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
    mode: modelProfile.mode,
    model: modelProfile.model ?? input.model,
    provider: modelProfile.provider ?? input.provider,
    system: [input.system, modelProfile.qualityInstruction].filter(Boolean).join("\n"),
    userId: input.userId,
    userPlan: input.userPlan,
    temperature: modelProfile.temperature,
    maxOutputTokens: modelProfile.maxOutputTokens,
  }

  const estimatedMinimumCredits = estimateCreditCost({
    prompt: moderation.sanitizedPrompt,
    mode: modelProfile.mode,
  })
  const creditsSnapshot = await assertMinimumCredits({
    userId: input.userId,
    userPlan: input.userPlan,
    minimumCredits: estimatedMinimumCredits,
  })

  const previousIncoherentTurns = Number.isFinite(workflowSession.state.context.incoherentTurns)
    ? Math.max(0, workflowSession.state.context.incoherentTurns ?? 0)
    : 0
  const incoherentPrompt = isLikelyIncoherentPrompt(moderation.sanitizedPrompt)
  const nextIncoherentTurns = incoherentPrompt ? Math.min(previousIncoherentTurns + 1, 3) : 0

  let plannerResult: GenerateAiTextResult | null = null
  let decision: PlannerDecision
  try {
    const plannerOutput = await runPlannerAi(aiInputBase, workflowSession.state, moderation.sanitizedPrompt)
    plannerResult = plannerOutput.planner
    decision = plannerOutput.decision
  } catch (plannerErr) {
    const plannerErrMsg = plannerErr instanceof Error ? plannerErr.message : String(plannerErr)
    // Re-throw hard errors (quota, auth, rate limit) — don't silently fall back
    if (
      plannerErrMsg.includes("quota") ||
      plannerErrMsg.includes("limit") ||
      plannerErrMsg.includes("401") ||
      plannerErrMsg.includes("403") ||
      plannerErrMsg.includes("All AI providers failed")
    ) {
      throw plannerErr
    }
    decision = inferFallbackDecision(workflowSession.state, moderation.sanitizedPrompt)
  }

  let tool = normalizeTool(decision.tool)
  let args: Record<string, unknown> = decision.args ?? {}

  // Guardrail: never queue a campaign before recipients are collected.
  const hasValidRecipients = (workflowSession.state.recipientStats?.valid ?? 0) > 0
  if (tool === "confirm_queue_campaign" && !hasValidRecipients) {
    tool = "request_recipients"
    args = {}
    decision = {
      ...decision,
      tool: "request_recipients",
      state: "AUDIENCE_COLLECTION",
      response: decision.response?.trim() || "Before sending, add recipient emails or upload a CSV.",
    }
  }

  yield {
    type: "tool_start",
    tool,
    args,
  }

  let toolResult = executeTool({
    tool,
    args,
    context: workflowSession.state.context,
    selectedTemplateId: workflowSession.state.selectedTemplateId,
    userPlan: input.userPlan,
  })

  // Fallback: if suggest_templates found no matching templates, switch to generate_hbs_template
  // so the AI generates a custom template matching the user's request
  if (tool === "suggest_templates" && (!toolResult.templateSuggestions || toolResult.templateSuggestions.length === 0)) {
    tool = "generate_hbs_template"
    args = {
      templateType: String((decision.args ?? {}).query ?? moderation.sanitizedPrompt),
      variables: "firstName,companyName,ctaUrl",
      style: "modern, professional",
      sections: "hero,body,features,cta,footer",
    }
    toolResult = executeTool({
      tool,
      args,
      context: workflowSession.state.context,
      selectedTemplateId: workflowSession.state.selectedTemplateId,
      userPlan: input.userPlan,
    })
  }

  yield {
    type: "tool_result",
    tool,
    result: toolResult,
  }

  const toolPatch = mapToolToPatch(decision, workflowSession.state, toolResult)
  const contextPatch: WorkflowMachineState["context"] = {
    incoherentTurns: nextIncoherentTurns,
  }
  if (shouldCaptureGoalPrompt(moderation.sanitizedPrompt) && !workflowSession.state.context.goal) {
    contextPatch.goal = moderation.sanitizedPrompt
  }

  const patched = applyWorkflowPatch(workflowSession.state, {
    state: toolPatch.state ?? decision.state,
    intent: toolPatch.intent ?? decision.intent,
    selectedTemplateId: toolResult.selectedTemplateId ?? workflowSession.state.selectedTemplateId,
    recipientStats: toolResult.recipientStats ?? workflowSession.state.recipientStats,
    summary: toolResult.text ?? workflowSession.state.summary,
    context: contextPatch,
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

  let responseResult: GenerateAiTextResult | null = null
  let finalText = decision.response?.trim() || ""
  let generatedHtml: string | null = null
  let generatedSubject: string | null = null

  const isEmailComposition = tool === "compose_signature_email" || tool === "compose_simple_email" || tool === "generate_hbs_template"

  // For generative skills: AI fills content fields only; layout always comes from HBS templates.
  if (isEmailComposition) {
    try {
      const topicParts = [
        persisted.state.context.goal,
        args.templateType ? String(args.templateType) : null,
        args.topic ? String(args.topic) : null,
        args.purpose ? String(args.purpose) : null,
        moderation.sanitizedPrompt,
      ].filter(Boolean)
      const topicDescription = topicParts.join(" — ")
      const defaultTemplateId =
        persisted.state.selectedTemplateId ??
        (tool === "compose_signature_email"
          ? "compose-signature-email"
          : tool === "compose_simple_email"
            ? "compose-simple-email"
            : resolveTemplateIdFromPrompt(topicDescription || moderation.sanitizedPrompt))

      const contentResult = await generateAiText({
        ...aiInputBase,
        temperature: 0.6,
        maxOutputTokens: 1400,
        system: [
          "You are an email campaign copywriter.",
          "You MUST NOT generate HTML.",
          "You MUST return ONLY valid JSON with plain text content fields.",
          "Required JSON keys: subject, title, subtitle, content, cta, image, footer.",
          "Optional keys: preheader, templateName, accentColor, backgroundColor, buttonColor, buttonTextColor.",
          "Do not include markdown, explanations, comments, or code fences.",
        ].join("\n"),
        prompt: [
          `User request: "${moderation.sanitizedPrompt}"`,
          `Email type: ${tool}`,
          `Topic/goal: ${topicDescription}`,
          `Base template id: ${defaultTemplateId}`,
          "",
          "Generate concise but rich content that fits an email newsletter structure.",
          "For content, include 2-3 short paragraphs separated by blank lines.",
          "Use a specific CTA phrase, not generic text.",
          "If user requested colors, include them in optional color fields.",
          "Output ONLY the JSON object.",
        ].join("\n"),
      })

      const parsed = safeJsonParse<Partial<TemplateRenderVariables>>(contentResult.text)
      const variables = normalizeTemplateVariables(defaultTemplateId, parsed ?? {})
      const rendered = renderEmailTemplateFromHbs(defaultTemplateId, variables)
      generatedHtml = rendered.html
      generatedSubject = variables.subject
    } catch {
      // Template rendering failed — continue with text-only response.
    }
  }

  // Stream the conversational response using the active agent's persona
  try {
    let streamedText = ""
    const plannerHint = decision.response?.trim() || ""
    const isTemplateFlow = tool === "suggest_templates" || tool === "select_template"
    const isSignatureOrSimple = persisted.state.intent === "SIGNATURE" || persisted.state.intent === "SIMPLE_EMAIL"

    // Resolve the active agent for the response persona
    const responseRouting = routeToAgent(moderation.sanitizedPrompt, persisted.state.state)
    const responseAgent = getAgentProfile(responseRouting.agentId)

    for await (const chunk of generateAiTextStream({
      ...aiInputBase,
      system: [
        `You are the "${responseAgent.name}" for Blastermailer — ${responseAgent.shortDescription}.`,
        "",
        "## CRITICAL: Do NOT be repetitive or overly persistent",
        "- If the user already gave you information (name, company, colors, style, etc.), USE IT IMMEDIATELY. Do NOT ask for it again.",
        "- If the user says 'yes', 'ok', 'sure', 'go ahead', or confirms — PROCEED with the action, don't ask more questions.",
        "- NEVER ask more than ONE question per response. If you need multiple pieces of info, pick the most important one.",
        "- If the user gave you enough info to act (even partially), ACT NOW and fill in reasonable defaults for anything missing.",
        "- When an email/signature/template has been generated, briefly describe it, then ask: 'Want any changes, or ready to add recipients and send?'",
        "",
        "## Response Rules",
        "- ALWAYS address what the user actually said. React to their specific words.",
        "- NEVER use formal letter format or sign-offs like 'Best regards'",
        "- NEVER start with 'Great choice!', 'Absolutely!', 'I can help with that!', or similar filler",
        "- Keep responses to 1-2 short paragraphs MAX. Be concise.",
        "- Do NOT repeat information the user already knows.",
        "- Do NOT list multiple options unless the user asked for options.",
        isSignatureOrSimple
          ? "- The user wants a signature or simple email — focus on that, not campaign templates"
          : "",
        tool === "generate_hbs_template" && generatedHtml
          ? "- A newsletter template has been generated and shown to the user. Briefly describe what it contains. Then ask: 'Want any changes, or shall we add your recipients and send it?'"
          : "",
        tool === "generate_hbs_template" && !generatedHtml
          ? "- Template generation failed. Ask ONE question about what they need. Don't list all possible options."
          : "",
        isEmailComposition && tool !== "generate_hbs_template" && generatedHtml
          ? "- An email has been generated and is shown to the user. Briefly describe it. Then ask: 'Want any changes, or ready to add recipients and send?'"
          : "",
        isEmailComposition && tool !== "generate_hbs_template" && !generatedHtml
          ? "- Ask ONE specific question to get the most critical missing detail. Don't ask for everything at once."
          : "",
      ].filter(Boolean).join("\n"),
      prompt: [
        `User said: "${moderation.sanitizedPrompt}"`,
        "",
        `Context:`,
        `- Active agent: ${responseAgent.name}`,
        `- Intent: ${persisted.state.intent}`,
        `- Workflow state: ${persisted.state.state}`,
        `- Goal: ${persisted.state.context.goal ?? "not yet defined"}`,
        isTemplateFlow && toolResult.templateSuggestions?.length
          ? `- Templates shown: ${toolResult.templateSuggestions.map((t) => t.name).join(", ")}`
          : "",
        isEmailComposition && generatedHtml
          ? `- Generated ${tool === "generate_hbs_template" ? "HBS template" : "email"} subject: "${generatedSubject ?? "(see preview)"}"`
          : "",
        isEmailComposition && !generatedHtml
          ? `- ${tool === "generate_hbs_template" ? "HBS template" : "Email"} generation needs more info from user`
          : "",
        plannerHint ? `- Planner note: ${plannerHint}` : "",
        "",
        "Write a natural, concise response. Be specific to what the user asked.",
      ].filter(Boolean).join("\n"),
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
  } catch (responseErr) {
    const responseErrMsg = responseErr instanceof Error ? responseErr.message : String(responseErr)
    // Re-throw hard errors so the stream route sends a proper error event
    if (
      responseErrMsg.includes("quota") ||
      responseErrMsg.includes("limit") ||
      responseErrMsg.includes("401") ||
      responseErrMsg.includes("403") ||
      responseErrMsg.includes("All AI providers failed") ||
      responseErrMsg.includes("caps are configured") ||
      responseErrMsg.includes("No AI provider")
    ) {
      throw responseErr
    }
    if (!finalText) finalText = decision.response?.trim() || ""
    if (finalText) {
      for (const token of chunkText(finalText)) {
        yield { type: "token", token }
      }
    }
  }

  if (!finalText) {
    finalText = decision.response?.trim() || "How can I help you today?"
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

  const totalAttempts = (plannerResult?.attempts?.length ?? 0) + (responseResult?.attempts?.length ?? 0)
  const responseCredits = estimateCreditCost({
    prompt: moderation.sanitizedPrompt,
    responseText: finalText,
    mode: modelProfile.mode,
    toolName: tool,
  })
  const creditsToCharge = Math.max(
    estimatedMinimumCredits,
    Math.min(10, responseCredits + Math.max(0, totalAttempts - 2)),
  )
  const creditCharge = await consumeAiCredits({
    userId: input.userId,
    userPlan: input.userPlan,
    credits: creditsToCharge,
    cachedSnapshot: creditsSnapshot,
  })

  // Compute estimated cost in EUR for telemetry
  const totalCostUsd =
    (plannerResult?.estimatedCostUsd ?? 0) + (responseResult?.estimatedCostUsd ?? 0)
  const estimatedCostEur = totalCostUsd > 0 ? usdToEur(totalCostUsd) : null

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
    generatedHtml: generatedHtml ?? null,
    generatedSubject: generatedSubject ?? null,
    remainingCredits: creditCharge.snapshot.remainingCredits,
    maxCredits: creditCharge.snapshot.maxCredits,
    estimatedCostEur,
    budgetDowngraded: modelProfile.budgetDowngraded ?? false,
  }
}
