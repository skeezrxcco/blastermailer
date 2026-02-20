import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { generateAiText } from "@/lib/ai"
import {
  buildStageSystemPrompt,
  createConversationId,
  mergeSystemPrompts,
  normalizeConversationId,
  normalizeRequestedStage,
  resolveOrchestrationStage,
  sanitizePromptForAi,
  type OrchestrationStage,
} from "@/lib/ai-chat-orchestration"
import { createJob } from "@/lib/jobs"
import { createMessage } from "@/lib/messaging"
import { prisma } from "@/lib/prisma"

function statusForAiError(message: string): number {
  const normalized = message.toLowerCase()
  if (
    normalized.includes("daily free ai limit reached") ||
    normalized.includes("daily free ai capacity is exhausted")
  ) {
    return 429
  }
  if (normalized.includes("no eligible ai provider available")) {
    return 503
  }
  if (normalized.includes("no daily provider caps are configured")) {
    return 503
  }
  if (normalized.includes("no ai provider api key configured")) {
    return 503
  }
  if (normalized.includes("all ai providers failed")) {
    return 502
  }
  return 500
}

function extractStageFromMetadata(metadata: unknown): OrchestrationStage | null {
  if (!metadata || typeof metadata !== "object") return null
  const stage = (metadata as Record<string, unknown>).stage
  return normalizeRequestedStage(typeof stage === "string" ? stage : undefined)
}

async function getPreviousConversationStage(userId: string, conversationId: string) {
  const message = await prisma.message.findFirst({
    where: {
      userId,
      channel: "ai",
      conversationId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      metadata: true,
    },
  })

  return extractStageFromMetadata(message?.metadata)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json()) as {
    prompt?: string
    system?: string
    model?: string
    provider?: string
    conversationId?: string
    stage?: string
    async?: boolean
  }

  const prompt = sanitizePromptForAi(String(body.prompt ?? ""))
  if (!prompt.trim()) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 422 })
  }

  const conversationId = normalizeConversationId(body.conversationId) ?? createConversationId()
  const requestedStage = normalizeRequestedStage(body.stage)
  const previousStage = await getPreviousConversationStage(session.user.id, conversationId)
  const stage = resolveOrchestrationStage({
    requestedStage,
    previousStage,
    prompt,
  })
  const stageSystemPrompt = buildStageSystemPrompt(stage)
  const systemPrompt = mergeSystemPrompts(stageSystemPrompt, body.system)

  if (body.async) {
    const job = await createJob({
      userId: session.user.id,
      type: "ai_generate",
      payload: {
        prompt,
        system: systemPrompt,
        model: body.model,
        provider: body.provider,
        conversationId,
        stage,
        userPlan: session.user.plan,
      },
    })

    return NextResponse.json({ job, conversationId, stage }, { status: 202 })
  }

  try {
    const startedAt = Date.now()
    const result = await generateAiText({
      prompt,
      system: systemPrompt,
      model: body.model,
      provider: body.provider,
      userId: session.user.id,
      userPlan: session.user.plan,
    })
    const latencyMs = Date.now() - startedAt

    await createMessage({
      userId: session.user.id,
      role: "USER",
      content: prompt,
      channel: "ai",
      conversationId,
      metadata: { stage },
    })

    const assistantMessage = await createMessage({
      userId: session.user.id,
      role: "ASSISTANT",
      content: result.text,
      channel: "ai",
      conversationId,
      metadata: {
        model: result.model,
        provider: result.provider,
        stage,
        latencyMs,
      },
    })

    return NextResponse.json({
      text: result.text,
      model: result.model,
      provider: result.provider,
      conversationId,
      stage,
      message: assistantMessage,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI generation failed"
    return NextResponse.json({ error: message }, { status: statusForAiError(message) })
  }
}
