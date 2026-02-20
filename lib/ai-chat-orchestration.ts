export type OrchestrationStage =
  | "intake"
  | "template_selection"
  | "audience_collection"
  | "review"
  | "send_confirmation"
  | "completed"

const STAGE_SEQUENCE: OrchestrationStage[] = [
  "intake",
  "template_selection",
  "audience_collection",
  "review",
  "send_confirmation",
  "completed",
]

const STAGE_HINTS: Record<OrchestrationStage, string[]> = {
  intake: ["idea", "brief", "goal", "campaign", "brand", "tone"],
  template_selection: ["template", "layout", "design", "preview", "marketplace"],
  audience_collection: ["email", "audience", "contacts", "csv", "recipient", "list"],
  review: ["review", "final", "proofread", "approve", "validation"],
  send_confirmation: ["send", "schedule", "confirm", "launch", "deliver"],
  completed: ["done", "completed", "finished", "sent"],
}

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function stageIndex(stage: OrchestrationStage) {
  return STAGE_SEQUENCE.indexOf(stage)
}

export function createConversationId() {
  const uuid = crypto.randomUUID().replace(/-/g, "")
  return `conv_${uuid.slice(0, 24)}`
}

export function normalizeConversationId(value: string | undefined): string | null {
  if (!value) return null
  const sanitized = value.trim()
  if (!sanitized) return null
  if (!/^[a-zA-Z0-9_-]{6,64}$/.test(sanitized)) return null
  return sanitized
}

export function normalizeRequestedStage(value: string | undefined): OrchestrationStage | null {
  const candidate = normalize(String(value ?? ""))
  return (STAGE_SEQUENCE as string[]).includes(candidate) ? (candidate as OrchestrationStage) : null
}

export function sanitizePromptForAi(prompt: string) {
  return prompt.replace(/\u0000/g, "").trim().slice(0, 6000)
}

export function inferStageFromPrompt(prompt: string): OrchestrationStage {
  const normalizedPrompt = normalize(prompt)
  let winningStage: OrchestrationStage = "intake"
  let winningScore = 0

  for (const stage of STAGE_SEQUENCE) {
    const score = STAGE_HINTS[stage].reduce((total, hint) => (normalizedPrompt.includes(hint) ? total + 1 : total), 0)
    if (score > winningScore) {
      winningStage = stage
      winningScore = score
    }
  }

  return winningStage
}

export function resolveOrchestrationStage(input: {
  requestedStage?: OrchestrationStage | null
  previousStage?: OrchestrationStage | null
  prompt: string
}) {
  if (input.requestedStage) return input.requestedStage

  const inferredStage = inferStageFromPrompt(input.prompt)
  if (!input.previousStage) return inferredStage

  // Keep stage progression monotonic unless the user explicitly requests otherwise.
  return stageIndex(inferredStage) >= stageIndex(input.previousStage) ? inferredStage : input.previousStage
}

export function buildStageSystemPrompt(stage: OrchestrationStage) {
  const common =
    "You are Blastermailer AI. Keep outputs production-ready, concise, and actionable. Never claim actions were executed unless confirmed."

  if (stage === "intake") {
    return `${common} Extract campaign objective, audience, tone, and CTA before drafting.`
  }
  if (stage === "template_selection") {
    return `${common} Focus on selecting or refining one template direction with rationale and concrete layout choices.`
  }
  if (stage === "audience_collection") {
    return `${common} Focus on recipient readiness, CSV/email validation, and deduplication guidance.`
  }
  if (stage === "review") {
    return `${common} Focus on final QA: content clarity, links, legal/compliance checks, and send safety.`
  }
  if (stage === "send_confirmation") {
    return `${common} Confirm schedule/send details, summarize risks, and ask for explicit final confirmation.`
  }
  return `${common} Summarize outcomes, next actions, and measurable campaign follow-up checkpoints.`
}

export function mergeSystemPrompts(stagePrompt: string, userSystem: string | undefined) {
  const custom = String(userSystem ?? "").trim()
  if (!custom) return stagePrompt
  return `${stagePrompt}\n\nAdditional instructions:\n${custom}`
}

