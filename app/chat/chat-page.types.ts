import type { ChatMessageSeed } from "@/app/chat/chat-page.data"
import type { TemplateEditorData } from "@/components/shared/newsletter/template-data"

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type ValidationStats = {
  total: number
  valid: number
  invalid: number
  duplicates: number
}

export type EmailEntryStatus = "valid" | "invalid" | "duplicate"

export type EmailEntry = {
  id: string
  value: string
  status: EmailEntryStatus
}

export type PreviewMode = "desktop" | "tablet" | "mobile"
export type DishKey = "one" | "two"
export type ImageEditTarget = "hero" | "dishOne" | "dishTwo"

export type EditorThemeState = {
  accentA: string
  accentB: string
  surface: string
  ctaBg: string
  ctaText: string
  dishOneImage: string
  dishTwoImage: string
}

export type ChatAttachment = {
  id: string
  file: File
  type: "image" | "document" | "csv"
  previewUrl?: string
  name: string
}

export type Message = ChatMessageSeed & {
  validationStats?: ValidationStats
  templateSuggestionIds?: string[]
  campaignId?: string
  generatedHtml?: string
  generatedSubject?: string
  attachments?: ChatAttachment[]
}

export type EditorChatMessage = {
  id: number
  role: "assistant" | "user"
  text: string
}

export type AiQualityMode = "fast" | "boost" | "max"

export type ModelChoice = {
  id: string
  label: string
  shortLabel: string
  mode: AiQualityMode
  requiresPro?: boolean
  quotaMultiplier: number
}

export type SpecificModelOption = {
  id: string
  label: string
  mode: AiQualityMode
}

export type ChatSessionSummary = {
  conversationId: string
  state: string
  intent: string
  selectedTemplateId?: string | null
  summary?: string | null
  context?: {
    goal?: string
  } | null
  lastActivityAt?: string
}

export type CsvParseResult =
  | { ok: true; entries: EmailEntry[] }
  | { ok: false; error: string }

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const viewportSpecs: Record<PreviewMode, { label: string; width: number; height: number }> = {
  desktop: { label: "Desktop", width: 1280, height: 900 },
  tablet: { label: "Tablet", width: 834, height: 1112 },
  mobile: { label: "Mobile", width: 390, height: 844 },
}

export const modelChoices: ModelChoice[] = [
  { id: "fast", label: "Fast", shortLabel: "Fast", mode: "fast", quotaMultiplier: 1 },
  { id: "boost", label: "Boost", shortLabel: "Boost", mode: "boost", requiresPro: true, quotaMultiplier: 3 },
  { id: "max", label: "Max", shortLabel: "Max", mode: "max", requiresPro: true, quotaMultiplier: 8 },
]

export const specificModelOptions: SpecificModelOption[] = [
  { id: "fast-gemini-2-flash", label: "Gemini 2.0 Flash", mode: "fast" },
  { id: "fast-gemini-15-flash", label: "Gemini 1.5 Flash", mode: "fast" },
  { id: "fast-openrouter-gpt4o-mini", label: "GPT-4o Mini", mode: "fast" },
  { id: "fast-openrouter-claude-haiku", label: "Claude 3.5 Haiku", mode: "fast" },
  { id: "boost-gemini-pro", label: "Gemini 2.5 Flash", mode: "boost" },
  { id: "boost-openrouter-gpt4o", label: "GPT-4o", mode: "boost" },
  { id: "boost-openrouter-claude-sonnet", label: "Claude Sonnet 4", mode: "boost" },
  { id: "max-gemini-25-pro", label: "Gemini 2.5 Pro", mode: "max" },
  { id: "max-openrouter-claude-opus", label: "Claude Sonnet 4", mode: "max" },
]
