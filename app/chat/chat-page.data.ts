export type ChatMessageSeed = {
  id: number
  role: "bot" | "user"
  text: string
  kind?: "suggestions"
}

export const initialChatMessages: ChatMessageSeed[] = [
  {
    id: 1,
    role: "bot",
    text: "Tell me your campaign goal and I will generate four professional templates.",
  },
]

export const chatCopy = {
  suggestionsIntro: "Here are four themed templates. Scroll horizontally and pick one to continue.",
  promptPlaceholder: "Describe your newsletter campaign...",
}

export function selectedTemplateNotice(templateName: string) {
  return `${templateName} is selected. You can now ask me for edits or send it.`
}

export function confirmedTemplateNotice(templateName: string) {
  return `${templateName} selected. I can now refine content inline or you can send.`
}
