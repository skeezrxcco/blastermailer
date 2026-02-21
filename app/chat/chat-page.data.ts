export type ChatMessageSeed = {
  id: number
  role: "bot" | "user"
  text: string
  kind?: "suggestions" | "templateReview" | "emailRequest" | "validation"
}

export const initialChatMessages: ChatMessageSeed[] = []

export const chatHeroTitle = "Por onde devemos comecar?"
export const chatHeroSubtitle = "Describe your campaign idea and I will guide you step by step."

export const chatCopy = {
  suggestionsIntro: "I selected template directions based on your objective. Pick one to continue.",
  emailRequestIntro: "Great. Paste emails in chat or click + to upload a CSV with an email header.",
  promptPlaceholder: "Pergunte qualquer coisa",
  emailInputPlaceholder: "Paste contacts emails or CSV rows here...",
}

export function selectedTemplateNotice(templateName: string) {
  return `${templateName} selected. Review it and continue to the audience step.`
}

export function confirmedTemplateNotice(templateName: string) {
  return `${templateName} is ready. Continue when you want to validate recipients.`
}
