import fs from "node:fs"
import path from "node:path"

import { templateOptions } from "@/components/shared/newsletter/template-data"

export type TemplateRenderVariables = {
  subject: string
  preheader: string
  templateName: string
  title: string
  subtitle: string
  content: string
  cta: string
  image: string
  footer: string
  accentColor: string
  backgroundColor: string
  buttonColor: string
  buttonTextColor: string
}

const TEMPLATE_DIR = path.join(process.cwd(), "lib/email-templates/newsletter")
const DEFAULT_TEMPLATE_ID = "default"
const cache = new Map<string, string>()

function escapeHtml(input: string): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function sanitizeTemplateId(templateId: string): string {
  return templateId.trim().toLowerCase().replace(/[^a-z0-9-]/g, "")
}

function isSafeHttpUrl(input: string): boolean {
  if (!input) return false
  try {
    const url = new URL(input)
    if (url.protocol === "https:") return true
    if (url.protocol !== "http:") return false
    return url.hostname === "localhost" || url.hostname === "127.0.0.1"
  } catch {
    return false
  }
}

function sanitizeImageUrl(input: string | undefined, fallback: string): string {
  const candidate = String(input ?? "").trim()
  if (candidate && isSafeHttpUrl(candidate)) return candidate
  return fallback
}

function sanitizeColor(input: string | undefined, fallback: string): string {
  const candidate = String(input ?? "").trim()
  if (!candidate) return fallback
  const isHex = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(candidate)
  const isNamed = /^[a-zA-Z]{3,24}$/.test(candidate)
  const isRgb = /^rgba?\([0-9\s.,%]+\)$/.test(candidate)
  return isHex || isNamed || isRgb ? candidate : fallback
}

function readTemplateFile(templateId: string): string {
  const normalized = sanitizeTemplateId(templateId)
  const cacheKey = normalized || DEFAULT_TEMPLATE_ID
  const fromCache = cache.get(cacheKey)
  if (fromCache) return fromCache

  const requestedPath = path.join(TEMPLATE_DIR, `${cacheKey}.hbs`)
  const defaultPath = path.join(TEMPLATE_DIR, `${DEFAULT_TEMPLATE_ID}.hbs`)
  const filePath = fs.existsSync(requestedPath) ? requestedPath : defaultPath
  const text = fs.readFileSync(filePath, "utf8")
  cache.set(cacheKey, text)
  return text
}

function renderTemplate(templateText: string, variables: TemplateRenderVariables): string {
  return templateText.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, rawKey) => {
    const key = rawKey as keyof TemplateRenderVariables
    const value = variables[key]
    return escapeHtml(typeof value === "string" ? value : "")
  })
}

export function resolveTemplateIdFromPrompt(prompt: string): string {
  const normalized = prompt.trim().toLowerCase()
  if (!normalized) return DEFAULT_TEMPLATE_ID

  const scored = templateOptions.map((template) => {
    const terms = [
      template.id,
      template.name,
      template.theme,
      template.domain,
      template.audience,
      ...template.description.toLowerCase().split(/\W+/),
    ]
      .map((term) => term.trim().toLowerCase())
      .filter(Boolean)

    let score = 0
    for (const term of terms) {
      if (term.length < 3) continue
      if (normalized.includes(term)) score += term.length > 7 ? 3 : 1
    }

    return { id: template.id, score }
  })

  const winner = scored.sort((a, b) => b.score - a.score)[0]
  return winner?.score > 0 ? winner.id : DEFAULT_TEMPLATE_ID
}

export function renderEmailTemplateFromHbs(
  templateId: string,
  variables: TemplateRenderVariables,
): { templateId: string; html: string } {
  const resolvedId = sanitizeTemplateId(templateId) || DEFAULT_TEMPLATE_ID
  const templateText = readTemplateFile(resolvedId)
  const html = renderTemplate(templateText, variables)
  return { templateId: resolvedId, html }
}

export function normalizeTemplateVariables(
  templateId: string,
  input: Partial<TemplateRenderVariables>,
): TemplateRenderVariables {
  const template = templateOptions.find((entry) => entry.id === templateId) ?? null
  const fallbackName = template?.name ?? "Newsletter Template"
  const fallbackImage = template?.heroImage ?? "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80"
  const accentColor = sanitizeColor(input.accentColor, template?.accentA ?? "#111827")
  const backgroundColor = sanitizeColor(input.backgroundColor, template?.surface ?? "#f4f4f7")
  const buttonColor = sanitizeColor(input.buttonColor, template?.ctaBg ?? "#111827")
  const buttonTextColor = sanitizeColor(input.buttonTextColor, template?.ctaText ?? "#ffffff")
  const image = sanitizeImageUrl(input.image, fallbackImage)

  return {
    subject: input.subject?.trim() || `${fallbackName} | New highlights this week`,
    preheader: input.preheader?.trim() || "A polished update with one clear value proposition and a direct next step.",
    templateName: input.templateName?.trim() || fallbackName,
    title: input.title?.trim() || fallbackName,
    subtitle: input.subtitle?.trim() || "Designed for stronger readability, clearer hierarchy, and higher conversion.",
    content: input.content?.trim() || "Lead with one meaningful insight, support it with concrete value, and close with a focused call to action.",
    cta: input.cta?.trim() || "See What’s New",
    image,
    footer: input.footer?.trim() || "You are receiving this email because you subscribed to updates.",
    accentColor,
    backgroundColor,
    buttonColor,
    buttonTextColor,
  }
}
