import {
  getBudgetFallbackModel,
  getModelForMode,
  isModelAccessible,
  MODEL_REGISTRY,
  type ModelRegistryEntry,
} from "@/lib/ai/model-registry"

export type AiModelMode = "fast" | "boost" | "max"

export type AiModelProfile = {
  mode: AiModelMode
  provider?: string
  model?: string
  temperature: number
  maxOutputTokens: number
  qualityInstruction: string
  /** True when the model was downgraded due to budget exhaustion */
  budgetDowngraded?: boolean
}

function isProPlan(plan: string | undefined) {
  const normalized = String(plan ?? "")
    .trim()
    .toLowerCase()
  return normalized === "pro" || normalized === "premium" || normalized === "enterprise"
}

export function normalizeAiModelMode(value: string | undefined | null): AiModelMode {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
  if (normalized === "fast") return "fast"
  if (normalized === "boost") return "boost"
  if (normalized === "max") return "max"
  // Legacy aliases
  if (normalized === "essential") return "fast"
  if (normalized === "balanced") return "boost"
  if (normalized === "premium") return "max"
  return "fast"
}

/**
 * Resolve the effective model profile for a request.
 *
 * Financial routing logic:
 * - If `budgetExhausted` is true and the user is on a paid plan, the model is
 *   hard-downgraded to Gemini 1.5 Flash (the cheapest Gemini model) regardless
 *   of the requested mode. This enforces the €12.50/month Pro AI budget cap.
 * - Free users are always capped at "fast" mode.
 * - `specificModel` allows selecting a specific registry entry within the
 *   resolved mode (e.g. "boost-openrouter-gpt4o").
 */
export function resolveAiModelProfile(input: {
  mode?: string | null
  userPlan?: string
  specificModel?: string | null
  budgetExhausted?: boolean
}): AiModelProfile {
  const requested = normalizeAiModelMode(input.mode)
  const pro = isProPlan(input.userPlan)
  const plan = input.userPlan ?? "free"

  // Financial hard cap: Pro user exceeded €12.50/month → force Flash
  if (input.budgetExhausted && pro) {
    const fallback = getBudgetFallbackModel()
    return {
      mode: fallback.mode,
      provider: fallback.provider,
      model: fallback.model,
      temperature: fallback.temperature,
      maxOutputTokens: fallback.maxOutputTokens,
      qualityInstruction: fallback.qualityInstruction,
      budgetDowngraded: true,
    }
  }

  // Free users can only access "fast" mode
  const effectiveMode = !pro && !isModelAccessible(requested, plan) ? "fast" : requested

  // Specific model override within the resolved mode
  let registryEntry: ModelRegistryEntry | undefined
  if (input.specificModel) {
    registryEntry = MODEL_REGISTRY.find(
      (e) => e.id === input.specificModel && e.mode === effectiveMode,
    )
  }
  if (!registryEntry) {
    registryEntry = getModelForMode(effectiveMode)
  }

  return {
    mode: registryEntry.mode,
    provider: process.env[`AI_MODE_${effectiveMode.toUpperCase()}_PROVIDER`] ?? registryEntry.provider,
    model: process.env[`AI_MODE_${effectiveMode.toUpperCase()}_MODEL`] ?? registryEntry.model,
    temperature: registryEntry.temperature,
    maxOutputTokens: registryEntry.maxOutputTokens,
    qualityInstruction: registryEntry.qualityInstruction,
    budgetDowngraded: false,
  }
}
