import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { MODEL_REGISTRY, getPlanBudget } from "@/lib/ai/model-registry"
import type { AiModelMode } from "@/lib/ai/model-mode"

/**
 * Returns which AI modes are available based on configured API keys and user plan.
 * One provider per mode — picks the first available provider in priority order.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const plan = session.user.plan ?? "free"
  const budget = getPlanBudget(plan)

  // Check which providers have API keys configured
  const configuredProviders = new Set<string>()
  if (process.env.GEMINI_API_KEY) configuredProviders.add("gemini")
  if (process.env.OPENROUTER_API_KEY) configuredProviders.add("openrouter")
  if (process.env.OPENAI_API_KEY) configuredProviders.add("openai")
  if (process.env.ANTHROPIC_API_KEY) configuredProviders.add("anthropic")

  const modes: AiModelMode[] = ["fast", "boost", "max"]
  const availableModes: {
    mode: AiModelMode
    available: boolean
    modelId: string | null
    modelLabel: string | null
    provider: string | null
    locked: boolean
  }[] = []

  for (const mode of modes) {
    const locked = !budget.modelAccess.includes(mode)

    // Find the first model in registry for this mode that has a configured provider
    const candidates = MODEL_REGISTRY.filter((m) => m.mode === mode)
    const match = candidates.find((m) => configuredProviders.has(m.provider))

    availableModes.push({
      mode,
      available: !!match,
      modelId: match?.id ?? null,
      modelLabel: match?.label ?? null,
      provider: match?.provider ?? null,
      locked,
    })
  }

  return NextResponse.json({
    modes: availableModes,
    configuredProviders: Array.from(configuredProviders),
  })
}
