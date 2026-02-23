import type { EmailEntry, CsvParseResult, ValidationStats, Message } from "@/app/chat/chat-page.types"

// ---------------------------------------------------------------------------
// Email validation helpers
// ---------------------------------------------------------------------------

export function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function computeValidationStats(entries: EmailEntry[]): ValidationStats {
  let valid = 0
  let invalid = 0
  let duplicates = 0

  for (const entry of entries) {
    if (entry.status === "valid") valid += 1
    if (entry.status === "invalid") invalid += 1
    if (entry.status === "duplicate") duplicates += 1
  }

  return {
    total: entries.length,
    valid,
    invalid,
    duplicates,
  }
}

export function normalizeEmailEntries(entries: EmailEntry[]): EmailEntry[] {
  const seenValid = new Set<string>()

  return entries
    .map((entry) => ({
      ...entry,
      value: entry.value.trim().toLowerCase().replace(/^["']|["']$/g, ""),
    }))
    .filter((entry) => entry.value.includes("@"))
    .map((entry) => {
      if (!looksLikeEmail(entry.value)) {
        return { ...entry, status: "invalid" as const }
      }
      if (seenValid.has(entry.value)) {
        return { ...entry, status: "duplicate" as const }
      }
      seenValid.add(entry.value)
      return { ...entry, status: "valid" as const }
    })
}

export function parseEmailEntries(raw: string): EmailEntry[] {
  const tokens = raw
    .split(/[;\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.replace(/^["']|["']$/g, ""))
    .filter((item) => item.includes("@"))

  const entries = tokens.map((value, index) => ({
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    value,
    status: "invalid" as const,
  }))

  return normalizeEmailEntries(entries)
}

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

function detectCsvDelimiter(headerLine: string): "," | ";" | "\t" {
  const delimiters: Array<"," | ";" | "\t"> = [",", ";", "\t"]
  let selected: "," | ";" | "\t" = ","
  let highestCount = -1

  for (const delimiter of delimiters) {
    const count = headerLine.split(delimiter).length - 1
    if (count > highestCount) {
      highestCount = count
      selected = delimiter
    }
  }

  return selected
}

function parseCsvLine(line: string, delimiter: "," | ";" | "\t"): string[] | null {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === delimiter && !inQuotes) {
      result.push(current)
      current = ""
      continue
    }

    current += char
  }

  if (inQuotes) return null

  result.push(current)
  return result
}

export function parseEmailEntriesFromCsvText(csvText: string): CsvParseResult {
  const normalized = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const lines = normalized.split("\n")

  const headerIndex = lines.findIndex((line) => line.trim().length > 0)
  if (headerIndex < 0) {
    return { ok: false, error: "CSV file is empty." }
  }

  const headerLine = lines[headerIndex].replace(/^\uFEFF/, "")
  const delimiter = detectCsvDelimiter(headerLine)
  const headerCells = parseCsvLine(headerLine, delimiter)
  if (!headerCells) {
    return { ok: false, error: "CSV header is malformed (unclosed quotes)." }
  }

  const headerMap = headerCells.map((cell) => cell.trim().toLowerCase())
  const emailIndex = headerMap.findIndex((cell) => cell === "email")
  if (emailIndex < 0) {
    return { ok: false, error: 'CSV must contain an "email" header column.' }
  }

  const entries: EmailEntry[] = []
  for (let lineIndex = headerIndex + 1; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex]
    if (!line.trim()) continue

    const cells = parseCsvLine(line, delimiter)
    if (!cells) {
      return { ok: false, error: `CSV row ${lineIndex + 1} is malformed (unclosed quotes).` }
    }

    if (emailIndex >= cells.length) {
      return { ok: false, error: `CSV row ${lineIndex + 1} does not include the email column.` }
    }

    const emailValue = (cells[emailIndex] ?? "").trim().replace(/^["']|["']$/g, "")
    if (!emailValue) {
      return { ok: false, error: `CSV row ${lineIndex + 1} has an empty email value.` }
    }

    entries.push({
      id: `${Date.now()}-${lineIndex}-${Math.random().toString(36).slice(2, 8)}`,
      value: emailValue,
      status: "invalid",
    })
  }

  if (!entries.length) {
    return { ok: false, error: 'No rows found under the "email" header.' }
  }

  return { ok: true, entries: normalizeEmailEntries(entries) }
}

// ---------------------------------------------------------------------------
// Message persistence
// ---------------------------------------------------------------------------

export async function persistMessage(input: {
  role: "USER" | "ASSISTANT"
  content: string
  conversationId: string | null
  metadata?: Record<string, unknown>
}) {
  if (!input.conversationId || !input.content.trim()) return
  try {
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: input.role,
        content: input.content,
        channel: "chat",
        conversationId: input.conversationId,
        metadata: input.metadata,
      }),
    })
  } catch {
    // Ignore persistence failures — messages are still in local state.
  }
}

export async function loadConversationMessages(conversationId: string): Promise<Message[]> {
  try {
    const response = await fetch(`/api/messages?conversationId=${encodeURIComponent(conversationId)}`, {
      method: "GET",
      cache: "no-store",
    })
    if (!response.ok) return []
    const payload = (await response.json()) as {
      messages?: Array<{ role: string; content: string; metadata?: Record<string, unknown> | null; createdAt?: string }>
    }
    return (payload.messages ?? []).map((m, i) => ({
      id: Date.now() + i,
      role: m.role === "USER" ? ("user" as const) : ("bot" as const),
      text: m.content,
      kind: (m.metadata?.kind as Message["kind"]) ?? undefined,
      templateSuggestionIds: (m.metadata?.templateSuggestionIds as string[]) ?? undefined,
    }))
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Text formatting
// ---------------------------------------------------------------------------

export function formatAssistantText(text: string) {
  return text
    .replace(/\s(\d+\.)\s/g, "\n$1 ")
    .replace(/:\s(\d+\.)\s/g, ":\n$1 ")
    .replace(/([?!])\s([A-Z])/g, "$1\n$2")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
