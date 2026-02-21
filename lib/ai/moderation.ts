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

  if (!isEmailScopePrompt(prompt)) {
    return {
      action: "rewrite_scope",
      sanitizedPrompt: `Convert this request into an actionable email task and ask one clarifying question before drafting content: ${prompt}`,
      message: "This assistant is email-only. I reframed your request into an email workflow.",
    }
  }

  return {
    action: "allow",
    sanitizedPrompt: prompt,
    message: "Prompt accepted.",
  }
}

