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
    id: "fast-gemini-2-flash",
    provider: "gemini",
    model: "gemini-2.0-flash",
    label: "Fast · Gemini 2.0 Flash",
    mode: "fast",
    inputCostPer1kTokens: 0.0001,
    outputCostPer1kTokens: 0.0004,
    maxOutputTokens: 2048,
    temperature: 0.55,
    qualityInstruction:
      "Write in a warm, conversational tone like a skilled marketing colleague. Be specific and actionable. Use natural language with short paragraphs. Show genuine interest in the user's goals and offer concrete suggestions.",
    expenseTier: "low",
    quotaMultiplier: 1,
  },
  {
    id: "fast-gemini-15-flash",
    provider: "gemini",
    model: "gemini-1.5-flash",
    label: "Fast · Gemini 1.5 Flash",
    mode: "fast",
    inputCostPer1kTokens: 0.000075,
    outputCostPer1kTokens: 0.0003,
    maxOutputTokens: 2048,
    temperature: 0.55,
    qualityInstruction:
      "Write in a warm, conversational tone like a skilled marketing colleague. Be specific and actionable. Use natural language with short paragraphs. Show genuine interest in the user's goals and offer concrete suggestions.",
    expenseTier: "low",
    quotaMultiplier: 1,
  },
  {
    id: "fast-openrouter-gpt4o-mini",
    provider: "openrouter",
    model: "openai/gpt-4o-mini",
    label: "Fast · GPT-4o Mini",
    mode: "fast",
    inputCostPer1kTokens: 0.00015,
    outputCostPer1kTokens: 0.0006,
    maxOutputTokens: 2048,
    temperature: 0.55,
    qualityInstruction:
      "Write in a warm, conversational tone like a skilled marketing colleague. Be specific and actionable. Use natural language with short paragraphs. Show genuine interest in the user's goals and offer concrete suggestions.",
    expenseTier: "low",
    quotaMultiplier: 1,
  },
  {
    id: "fast-openrouter-claude-haiku",
    provider: "openrouter",
    model: "anthropic/claude-3-5-haiku-latest",
    label: "Fast · Claude 3.5 Haiku",
    mode: "fast",
    inputCostPer1kTokens: 0.0008,
    outputCostPer1kTokens: 0.004,
    maxOutputTokens: 2048,
    temperature: 0.55,
    qualityInstruction:
      "Write in a warm, conversational tone like a skilled marketing colleague. Be specific and actionable. Use natural language with short paragraphs. Show genuine interest in the user's goals and offer concrete suggestions.",
    expenseTier: "low",
    quotaMultiplier: 1,
  },
  // ── Boost mode (Balanced) ────────────────────────────────────────────────
  {
    id: "boost-gemini-pro",
    provider: "gemini",
    model: "gemini-2.5-flash-preview-05-20",
    label: "Boost · Gemini 2.5 Flash",
    mode: "boost",
    inputCostPer1kTokens: 0.0015,
    outputCostPer1kTokens: 0.006,
    maxOutputTokens: 3072,
    temperature: 0.65,
    qualityInstruction:
      "You are an expert email marketing strategist. Write with personality and genuine expertise. Provide detailed, insightful advice that shows deep understanding of the user's business context. Use a natural, engaging tone — like a senior consultant who truly cares about results. Be specific with examples and data-backed suggestions.",
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
    maxOutputTokens: 3072,
    temperature: 0.65,
    qualityInstruction:
      "You are an expert email marketing strategist. Write with personality and genuine expertise. Provide detailed, insightful advice that shows deep understanding of the user's business context. Use a natural, engaging tone — like a senior consultant who truly cares about results. Be specific with examples and data-backed suggestions.",
    expenseTier: "medium",
    quotaMultiplier: 3,
  },
  {
    id: "boost-openrouter-claude-sonnet",
    provider: "openrouter",
    model: "anthropic/claude-sonnet-4-20250514",
    label: "Boost · Claude Sonnet 4",
    mode: "boost",
    inputCostPer1kTokens: 0.003,
    outputCostPer1kTokens: 0.015,
    maxOutputTokens: 3072,
    temperature: 0.65,
    qualityInstruction:
      "You are an expert email marketing strategist. Write with personality and genuine expertise. Provide detailed, insightful advice that shows deep understanding of the user's business context. Use a natural, engaging tone — like a senior consultant who truly cares about results. Be specific with examples and data-backed suggestions.",
    expenseTier: "medium",
    quotaMultiplier: 3,
  },
  // ── Max mode (Creative/Deep) ─────────────────────────────────────────────
  {
    id: "max-gemini-25-pro",
    provider: "gemini",
    model: "gemini-2.5-pro-preview-05-06",
    label: "Max · Gemini 2.5 Pro",
    mode: "max",
    inputCostPer1kTokens: 0.00125,
    outputCostPer1kTokens: 0.01,
    maxOutputTokens: 4096,
    temperature: 0.72,
    qualityInstruction:
      "You are a world-class email marketing creative director. Deliver premium, publication-quality writing with compelling storytelling, sophisticated persuasion techniques, and flawless copy. Combine data-driven strategy with creative brilliance. Every word should earn its place. Write with the confidence and flair of a top-tier copywriter who consistently delivers award-winning campaigns.",
    expenseTier: "high",
    quotaMultiplier: 8,
  },
  {
    id: "max-openrouter-claude-opus",
    provider: "openrouter",
    model: "anthropic/claude-sonnet-4-20250514",
    label: "Max · Claude Sonnet 4",
    mode: "max",
    inputCostPer1kTokens: 0.003,
    outputCostPer1kTokens: 0.015,
    maxOutputTokens: 4096,
    temperature: 0.72,
    qualityInstruction:
      "You are a world-class email marketing creative director. Deliver premium, publication-quality writing with compelling storytelling, sophisticated persuasion techniques, and flawless copy. Combine data-driven strategy with creative brilliance. Every word should earn its place. Write with the confidence and flair of a top-tier copywriter who consistently delivers award-winning campaigns.",
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
  return MODEL_REGISTRY.find((e) => e.id === "fast-gemini-2-flash") ?? MODEL_REGISTRY[0]
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
