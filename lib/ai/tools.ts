import { templateOptions } from "@/components/shared/newsletter/template-data"
import type { RecipientValidationStats, TemplateSuggestion, ToolResultPayload, WorkflowSessionContext } from "@/lib/ai/types"

export type ToolExecutionInput = {
  tool: string
  args: Record<string, unknown>
  context: WorkflowSessionContext
  selectedTemplateId: string | null
}

function normalize(text: string) {
  return text.trim().toLowerCase()
}

function scoreTemplate(template: (typeof templateOptions)[number], query: string) {
  const candidate = normalize(`${template.name} ${template.theme} ${template.domain} ${template.tone}`)
  const tokens = normalize(query)
    .split(/\s+/)
    .filter((token) => token.length > 2)

  return tokens.reduce((score, token) => (candidate.includes(token) ? score + 1 : score), 0)
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

  if (tool === "ask_campaign_type") {
    return {
      text: "What type of email campaign are you planning: newsletter, product update, promotion, or a simple one-off email?",
    }
  }

  if (tool === "suggest_templates") {
    const query = String(input.args.query ?? input.context.goal ?? "")
    const ranked = [...templateOptions]
      .sort((a, b) => scoreTemplate(b, query) - scoreTemplate(a, query))
      .slice(0, 4)
      .map(toSuggestion)

    return {
      text: "I selected four template directions that best match your campaign.",
      templateSuggestions: ranked,
    }
  }

  if (tool === "select_template") {
    const templateId = String(input.args.templateId ?? "")
    const found = templateOptions.find((template) => template.id === templateId)
    if (!found) {
      return {
        text: "I could not find that template. Pick one of the suggestions and I will continue.",
      }
    }
    return {
      text: `${found.name} selected. I can now help refine content and collect recipients.`,
      selectedTemplateId: found.id,
    }
  }

  if (tool === "request_recipients") {
    return {
      text: "Please paste recipient emails or upload a CSV with an email column.",
    }
  }

  if (tool === "validate_recipients") {
    const source = String(input.args.recipients ?? "")
    const stats = parseEmails(source)
    return {
      text: `Validation complete: ${stats.valid} valid, ${stats.invalid} invalid, ${stats.duplicates} duplicates.`,
      recipientStats: stats,
    }
  }

  if (tool === "review_campaign") {
    const templateName = templateOptions.find((entry) => entry.id === input.selectedTemplateId)?.name ?? "selected template"
    return {
      text: `Quick review: goal captured, ${templateName} configured, and recipients validated. Ready for final confirmation.`,
    }
  }

  if (tool === "confirm_queue_campaign") {
    const campaignId = `cmp-${Date.now().toString().slice(-8)}`
    return {
      text: `Campaign queued successfully with ID ${campaignId}.`,
      campaignId,
    }
  }

  if (tool === "compose_signature_email") {
    return {
      text: "I will draft a concise professional signature email with clear sender signature fields.",
    }
  }

  return {
    text: "I will draft a professional email now and keep it aligned with your campaign objective.",
  }
}

