import type { AiModelMode } from "@/lib/ai/model-mode"

// EUR/USD conversion rate for cost accounting
const EUR_USD_RATE = 0.92

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModelRegistryEntry = {
  id: string
  provider: string
  model: string
  label: string
  mode: AiModelMode
  inputCostPer1kTokens: number
  outputCostPer1kTokens: number
  maxOutputTokens: number
  temperature: number
  qualityInstruction: string
  /** "low" | "medium" | "high" — relative expense indicator for the UI */
  expenseTier: "low" | "medium" | "high"
  /** How fast this model consumes quota relative to the base (essential) model */
  quotaMultiplier: number
}

export type PlanUsageBudget = {
  plan: string
  /**
   * Max AI spend per calendar month in EUR.
   * Pro: €12.50 (net after 15% platform margin on €15.99 subscription).
   */
  monthlyBudgetEur: number
  /** Which model modes this plan can access */
  modelAccess: AiModelMode[]
}

export type PlatformRevenueConfig = {
  platformCutPercent: number
  freeUserFundPercent: number
}

// ---------------------------------------------------------------------------
// Revenue split — 15% platform margin, 40% of that funds free users
// ---------------------------------------------------------------------------

export const PLATFORM_REVENUE_CONFIG: PlatformRevenueConfig = {
  platformCutPercent: 15,
  freeUserFundPercent: 40,
}

/**
 * Hard monthly AI budget for Pro users in EUR.
 * Derived from: €15.99 subscription × (1 - 0.15 platform margin) ≈ €13.59,
 * minus payment processor fees ≈ €12.50 net for AI spend.
 */
export const PRO_MONTHLY_AI_BUDGET_EUR = 12.50

// ---------------------------------------------------------------------------
// Plan budgets — expressed in EUR provider-cost, NOT tokens.
// Internal cost accounting — never exposed to users.
// ---------------------------------------------------------------------------

export const PLAN_USAGE_BUDGETS: PlanUsageBudget[] = [
  {
    plan: "free",
    monthlyBudgetEur: 0.25,
    modelAccess: ["fast"],
  },
  {
    plan: "pro",
    monthlyBudgetEur: PRO_MONTHLY_AI_BUDGET_EUR,
    modelAccess: ["fast", "boost", "max"],
  },
  {
    plan: "premium",
    monthlyBudgetEur: 30.00,
    modelAccess: ["fast", "boost", "max"],
  },
]

// ---------------------------------------------------------------------------
// Model registry — Gemini primary, OpenRouter secondary for non-Gemini options
// Pricing in USD per 1K tokens
// ---------------------------------------------------------------------------

export const MODEL_REGISTRY: ModelRegistryEntry[] = [
  // ── Fast mode (Performance) ─────────────────────────────────────────────
  {
    id: "fast-gemini-15-flash",
    provider: "gemini",
    model: "gemini-1.5-flash",
    label: "Fast · Gemini 1.5 Flash",
    mode: "fast",
    inputCostPer1kTokens: 0.000075,
    outputCostPer1kTokens: 0.0003,
    maxOutputTokens: 700,
    temperature: 0.22,
    qualityInstruction:
      "Maximize quality under tight budget: be precise, avoid fluff, use short structured output, validate assumptions, and produce actionable copy.",
    expenseTier: "low",
    quotaMultiplier: 1,
  },
  {
    id: "fast-gemini-2-flash",
    provider: "gemini",
    model: "gemini-2.0-flash",
    label: "Fast · Gemini 2.0 Flash",
    mode: "fast",
    inputCostPer1kTokens: 0.0001,
    outputCostPer1kTokens: 0.0004,
    maxOutputTokens: 700,
    temperature: 0.22,
    qualityInstruction:
      "Maximize quality under tight budget: be precise, avoid fluff, use short structured output, validate assumptions, and produce actionable copy.",
    expenseTier: "low",
    quotaMultiplier: 1,
  },
  {
    id: "fast-openrouter-gpt35",
    provider: "openrouter",
    model: "openai/gpt-3.5-turbo",
    label: "Fast · GPT-3.5 Turbo",
    mode: "fast",
    inputCostPer1kTokens: 0.0005,
    outputCostPer1kTokens: 0.0015,
    maxOutputTokens: 700,
    temperature: 0.22,
    qualityInstruction:
      "Maximize quality under tight budget: be precise, avoid fluff, use short structured output, validate assumptions, and produce actionable copy.",
    expenseTier: "low",
    quotaMultiplier: 1,
  },
  {
    id: "fast-openrouter-claude-haiku",
    provider: "openrouter",
    model: "anthropic/claude-3-haiku",
    label: "Fast · Claude Haiku",
    mode: "fast",
    inputCostPer1kTokens: 0.00025,
    outputCostPer1kTokens: 0.00125,
    maxOutputTokens: 700,
    temperature: 0.22,
    qualityInstruction:
      "Maximize quality under tight budget: be precise, avoid fluff, use short structured output, validate assumptions, and produce actionable copy.",
    expenseTier: "low",
    quotaMultiplier: 1,
  },
  // ── Boost mode (Balanced) ────────────────────────────────────────────────
  {
    id: "boost-gemini-pro",
    provider: "gemini",
    model: "gemini-2.0-pro-exp",
    label: "Boost · Gemini 2.0 Pro",
    mode: "boost",
    inputCostPer1kTokens: 0.0025,
    outputCostPer1kTokens: 0.0075,
    maxOutputTokens: 900,
    temperature: 0.28,
    qualityInstruction:
      "Prioritize high signal: clear campaign strategy, concise sections, practical next actions, and consistent tone aligned to audience and goal.",
    expenseTier: "medium",
    quotaMultiplier: 3,
  },
  {
    id: "boost-openrouter-gpt4o",
    provider: "openrouter",
    model: "openai/gpt-4o",
    label: "Boost · GPT-4o",
    mode: "boost",
    inputCostPer1kTokens: 0.005,
    outputCostPer1kTokens: 0.015,
    maxOutputTokens: 900,
    temperature: 0.28,
    qualityInstruction:
      "Prioritize high signal: clear campaign strategy, concise sections, practical next actions, and consistent tone aligned to audience and goal.",
    expenseTier: "medium",
    quotaMultiplier: 3,
  },
  {
    id: "boost-openrouter-claude-sonnet",
    provider: "openrouter",
    model: "anthropic/claude-3-5-sonnet",
    label: "Boost · Claude 3.5 Sonnet",
    mode: "boost",
    inputCostPer1kTokens: 0.003,
    outputCostPer1kTokens: 0.015,
    maxOutputTokens: 900,
    temperature: 0.28,
    qualityInstruction:
      "Prioritize high signal: clear campaign strategy, concise sections, practical next actions, and consistent tone aligned to audience and goal.",
    expenseTier: "medium",
    quotaMultiplier: 3,
  },
  // ── Max mode (Creative/Deep) ─────────────────────────────────────────────
  {
    id: "max-gemini-25-flash",
    provider: "gemini",
    model: "gemini-2.5-flash-preview-04-17",
    label: "Max · Gemini 2.5 Flash",
    mode: "max",
    inputCostPer1kTokens: 0.0015,
    outputCostPer1kTokens: 0.006,
    maxOutputTokens: 1200,
    temperature: 0.2,
    qualityInstruction:
      "Deliver premium quality: accurate, concrete, and conversion-focused copy with clear structure, strong CTA logic, and polished wording.",
    expenseTier: "high",
    quotaMultiplier: 8,
  },
  {
    id: "max-openrouter-claude-opus",
    provider: "openrouter",
    model: "anthropic/claude-3-opus",
    label: "Max · Claude 3 Opus",
    mode: "max",
    inputCostPer1kTokens: 0.015,
    outputCostPer1kTokens: 0.075,
    maxOutputTokens: 1200,
    temperature: 0.2,
    qualityInstruction:
      "Deliver premium quality: accurate, concrete, and conversion-focused copy with clear structure, strong CTA logic, and polished wording.",
    expenseTier: "high",
    quotaMultiplier: 8,
  },
]

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export function getModelsForMode(mode: AiModelMode): ModelRegistryEntry[] {
  return MODEL_REGISTRY.filter((entry) => entry.mode === mode)
}

export function getModelForMode(mode: AiModelMode): ModelRegistryEntry {
  const envProvider = process.env[`AI_MODE_${mode.toUpperCase()}_PROVIDER`]
  const envModel = process.env[`AI_MODE_${mode.toUpperCase()}_MODEL`]

  if (envProvider && envModel) {
    const match = MODEL_REGISTRY.find(
      (entry) => entry.provider === envProvider && entry.model === envModel,
    )
    if (match) return match
  }

  const candidates = MODEL_REGISTRY.filter((entry) => entry.mode === mode)
  return candidates[0] ?? MODEL_REGISTRY[0]
}

/** Returns the fallback Flash model used when budget is exhausted */
export function getBudgetFallbackModel(): ModelRegistryEntry {
  return MODEL_REGISTRY.find((e) => e.id === "fast-gemini-15-flash") ?? MODEL_REGISTRY[0]
}

export function getPlanBudget(plan: string): PlanUsageBudget {
  const normalized = (plan ?? "free").trim().toLowerCase()
  return (
    PLAN_USAGE_BUDGETS.find((entry) => entry.plan === normalized) ??
    PLAN_USAGE_BUDGETS[0]
  )
}

export function isModelAccessible(mode: AiModelMode, plan: string): boolean {
  const budget = getPlanBudget(plan)
  return budget.modelAccess.includes(mode)
}

// ---------------------------------------------------------------------------
// Cost estimation
// ---------------------------------------------------------------------------

export function estimateTokenCost(
  modelEntry: ModelRegistryEntry,
  inputTokens: number,
  outputTokens: number,
): number {
  const inputCost = (inputTokens / 1000) * modelEntry.inputCostPer1kTokens
  const outputCost = (outputTokens / 1000) * modelEntry.outputCostPer1kTokens
  return Number((inputCost + outputCost).toFixed(6))
}

export function estimateTokensFromText(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return Math.ceil(trimmed.length / 4)
}

/**
 * Estimate the provider cost (USD) for a single average message exchange.
 * Assumes ~300 input tokens (prompt + system) and model's maxOutputTokens.
 */
export function estimatePerMessageCostUsd(modelEntry: ModelRegistryEntry): number {
  const avgInputTokens = 300
  const avgOutputTokens = Math.min(modelEntry.maxOutputTokens, 600)
  return estimateTokenCost(modelEntry, avgInputTokens, avgOutputTokens)
}

/**
 * Estimate how many messages a user can send with their remaining budget on a given model.
 */
export function estimateRemainingMessages(
  modelEntry: ModelRegistryEntry,
  remainingBudgetUsd: number,
): number {
  const perMessage = estimatePerMessageCostUsd(modelEntry)
  if (perMessage <= 0) return 9999
  return Math.floor(remainingBudgetUsd / perMessage)
}

/**
 * Convert a provider cost in USD to a credit-style integer for backward compat.
 */
export function tokenCostToCredits(
  modelEntry: ModelRegistryEntry,
  inputTokens: number,
  outputTokens: number,
): number {
  const costUsd = estimateTokenCost(modelEntry, inputTokens, outputTokens)

  const modeMultiplier =
    modelEntry.mode === "max" ? 3.0 : modelEntry.mode === "boost" ? 1.5 : 1.0

  const rawCredits = Math.ceil(costUsd * 10000 * modeMultiplier)
  return Math.max(1, Math.min(rawCredits, 50))
}

// ---------------------------------------------------------------------------
// Revenue split helpers
// ---------------------------------------------------------------------------

/**
 * Convert USD cost to EUR for budget accounting.
 */
export function usdToEur(usd: number): number {
  return Number((usd * EUR_USD_RATE).toFixed(6))
}

export function calculateFreeUserTokenAllocation(
  subscriptionRevenue: number,
): { platformRevenue: number; freeUserFund: number; platformProfit: number } {
  const platformCut =
    subscriptionRevenue * (PLATFORM_REVENUE_CONFIG.platformCutPercent / 100)
  const freeUserFund =
    platformCut * (PLATFORM_REVENUE_CONFIG.freeUserFundPercent / 100)
  const platformProfit = platformCut - freeUserFund

  return {
    platformRevenue: platformCut,
    freeUserFund,
    platformProfit,
  }
}

// ---------------------------------------------------------------------------
// UI-facing serializable model info (safe to send to the client)
// ---------------------------------------------------------------------------

export type ModelInfoForClient = {
  id: string
  label: string
  mode: AiModelMode
  expenseTier: "low" | "medium" | "high"
  quotaMultiplier: number
}

export function getModelsForClient(plan: string): ModelInfoForClient[] {
  const budget = getPlanBudget(plan)
  return MODEL_REGISTRY
    .filter((entry) => budget.modelAccess.includes(entry.mode))
    .map((entry) => ({
      id: entry.id,
      label: entry.label,
      mode: entry.mode,
      expenseTier: entry.expenseTier,
      quotaMultiplier: entry.quotaMultiplier,
    }))
}
