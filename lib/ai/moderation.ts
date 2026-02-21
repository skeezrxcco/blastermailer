type ModerationAction = "allow" | "rewrite_scope" | "rewrite_safety"

export type ModerationResult = {
  action: ModerationAction
  sanitizedPrompt: string
  message: string
}

const EMAIL_SCOPE_HINTS = [
  "email",
  "newsletter",
  "campaign",
  "subject line",
  "recipients",
  "mail",
  "smtp",
  "signature",
  "cta",
]

const GREETING_HINTS = [
  "hi",
  "hello",
  "hey",
  "yo",
  "good morning",
  "good afternoon",
  "good evening",
  "ola",
  "olá",
  "bom dia",
  "boa tarde",
  "boa noite",
]

const SAFETY_SENSITIVE_HINTS = [
  "phishing",
  "steal password",
  "malware",
  "exploit",
  "fraud",
  "blackmail",
  "hate speech",
  "scam",
  "credential stuffing",
]

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function isEmailScopePrompt(prompt: string) {
  const candidate = normalize(prompt)
  return EMAIL_SCOPE_HINTS.some((hint) => candidate.includes(hint))
}

function isUnsafePrompt(prompt: string) {
  const candidate = normalize(prompt)
  return SAFETY_SENSITIVE_HINTS.some((hint) => candidate.includes(hint))
}

function isGreetingPrompt(prompt: string) {
  const candidate = normalize(prompt)
  if (!candidate) return false
  if (candidate.length <= 16 && GREETING_HINTS.includes(candidate)) return true
  return GREETING_HINTS.some((hint) => candidate === hint || candidate.startsWith(`${hint} `))
}

export function moderatePrompt(rawPrompt: string): ModerationResult {
  const prompt = rawPrompt.replace(/\u0000/g, "").trim().slice(0, 6000)
  if (!prompt) {
    return {
      action: "allow",
      sanitizedPrompt: "Help me create an email campaign.",
      message: "Starting in email mode.",
    }
  }

  if (isUnsafePrompt(prompt)) {
    return {
      action: "rewrite_safety",
      sanitizedPrompt:
        "Rewrite this request into a safe, lawful, professional email campaign brief that avoids harmful actions and keeps marketing compliance.",
      message: "I rewrote that into a safe email brief and will continue in compliant mode.",
    }
  }

  if (isGreetingPrompt(prompt)) {
    return {
      action: "allow",
      sanitizedPrompt: prompt,
      message: "Greeting detected.",
    }
  }

  if (!isEmailScopePrompt(prompt)) {
    return {
      action: "rewrite_scope",
      sanitizedPrompt: `Keep this conversation focused on email workflows. Ask a short clarifying question about campaign type and goal before drafting.`,
      message: "Redirected to email scope.",
    }
  }

  return {
    action: "allow",
    sanitizedPrompt: prompt,
    message: "Prompt accepted.",
  }
}
