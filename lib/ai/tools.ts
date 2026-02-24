import { templateOptions } from "@/components/shared/newsletter/template-data"
import type { RecipientValidationStats, TemplateSuggestion, ToolResultPayload, WorkflowSessionContext } from "@/lib/ai/types"

export type ToolExecutionInput = {
  tool: string
  args: Record<string, unknown>
  context: WorkflowSessionContext
  selectedTemplateId: string | null
  userPlan?: string
}

function normalize(text: string) {
  return text.trim().toLowerCase()
}

function scoreTemplate(template: (typeof templateOptions)[number], query: string) {
  const candidate = normalize(
    `${template.name} ${template.theme} ${template.domain} ${template.tone} ${template.description} ${template.audience}`,
  )
  const queryNorm = normalize(query)
  const tokens = queryNorm
    .split(/\s+/)
    .filter((token) => token.length > 2)

  let score = tokens.reduce((acc, token) => (candidate.includes(token) ? acc + 1 : acc), 0)

  // Bonus for exact domain match (e.g. "real estate" matches "Real Estate" domain)
  if (normalize(template.domain).includes(queryNorm) || queryNorm.includes(normalize(template.domain))) {
    score += 3
  }

  return score
}

function toSuggestion(template: (typeof templateOptions)[number]): TemplateSuggestion {
  return {
    id: template.id,
    name: template.name,
    theme: template.theme,
    domain: template.domain,
    tone: template.tone,
  }
}

function parseEmails(input: string) {
  const tokens = input
    .split(/[;\n,]/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)

  const valid = new Set<string>()
  let invalid = 0
  let duplicates = 0

  for (const token of tokens) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(token)) {
      invalid += 1
      continue
    }
    if (valid.has(token)) {
      duplicates += 1
      continue
    }
    valid.add(token)
  }

  const stats: RecipientValidationStats = {
    total: tokens.length,
    valid: valid.size,
    invalid,
    duplicates,
  }

  return stats
}

export function executeTool(input: ToolExecutionInput): ToolResultPayload {
  const tool = input.tool.trim().toLowerCase()
  const normalizedPlan = String(input.userPlan ?? "")
    .trim()
    .toLowerCase()
  const isProUser = normalizedPlan === "pro" || normalizedPlan === "premium" || normalizedPlan === "enterprise"

  if (tool === "ask_campaign_type") {
    return {}
  }

  if (tool === "suggest_templates") {
    const query = String(input.args.query ?? input.context.goal ?? "")
    const scored = templateOptions
      .filter((template) => isProUser || template.accessTier !== "pro")
      .map((template) => ({ template, score: scoreTemplate(template, query) }))
      .filter(({ score }) => score >= 1)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)

    // If no templates match the query, return empty so orchestrator
    // can fall back to generating a custom HBS template
    if (scored.length === 0) {
      return { templateSuggestions: [] }
    }

    return { templateSuggestions: scored.map(({ template }) => toSuggestion(template)) }
  }

  if (tool === "select_template") {
    const templateId = String(input.args.templateId ?? "")
    const found = templateOptions.find((template) => template.id === templateId)
    if (!found) return {}
    if (!isProUser && found.accessTier === "pro") return {}
    return { selectedTemplateId: found.id }
  }

  if (tool === "request_recipients") {
    return {}
  }

  if (tool === "validate_recipients") {
    const source = String(input.args.recipients ?? "")
    const stats = parseEmails(source)
    return { recipientStats: stats }
  }

  if (tool === "review_campaign") {
    const templateName = templateOptions.find((entry) => entry.id === input.selectedTemplateId)?.name ?? "selected template"
    return { text: templateName }
  }

  if (tool === "confirm_queue_campaign") {
    const campaignId = `cmp-${Date.now().toString().slice(-8)}`
    return { campaignId }
  }

  if (tool === "compose_signature_email" || tool === "compose_simple_email" || tool === "generate_hbs_template") {
    return {}
  }

  return {}
}
