"use client"

import { templateOptions } from "@/components/shared/newsletter/template-data"
import { persistMessage } from "@/app/chat/chat-page.utils"
import type { AiQualityMode, Message } from "@/app/chat/chat-page.types"
import { modelChoices } from "@/app/chat/chat-page.types"
import type { AiStreamEvent } from "@/lib/ai/types"

type StreamCallbacks = {
  isPaidPlan: boolean
  conversationId: string | null
  selectedModelChoice: string
  selectedSpecificModel: string | null
  setConversationId: (id: string) => void
  setWorkflowState: (state: string) => void
  setComposerMode: (mode: "prompt" | "emails") => void
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  setIsAiResponding: (v: boolean) => void
  applyTemplateSelection: (template: NonNullable<ReturnType<typeof templateOptions.find>>, announce: boolean) => void
  onQueued: (campaignId: string, validAudience: number, templateName: string) => void
}

export function useChatStream() {
  const streamPrompt = async (
    value: string,
    assistantMessageId: number,
    callbacks: StreamCallbacks,
  ) => {
    const {
      isPaidPlan, conversationId, selectedModelChoice, selectedSpecificModel,
      setConversationId, setWorkflowState, setComposerMode, setMessages,
      setIsAiResponding, applyTemplateSelection, onQueued,
    } = callbacks

    const chosenModel = modelChoices.find((o) => o.id === selectedModelChoice) ?? modelChoices[0]
    const resolvedMode: AiQualityMode = !isPaidPlan && chosenModel.requiresPro ? "fast" : chosenModel.mode
    const resolvedSpecificModel = resolvedMode === chosenModel.mode ? selectedSpecificModel : null
    let activeConversationId = conversationId

    void persistMessage({ role: "USER", content: value, conversationId: activeConversationId })

    setIsAiResponding(true)
    try {
      const response = await fetch("/api/ai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: value,
          conversationId: conversationId ?? undefined,
          qualityMode: resolvedMode,
          specificModel: resolvedSpecificModel ?? undefined,
        }),
      })

      if (!response.ok) throw new Error((await response.text()) || "AI request failed")

      const reader = response.body?.getReader()
      if (!reader) throw new Error("AI stream did not return a readable body.")

      const decoder = new TextDecoder()
      let buffer = ""
      let streamedText = ""
      let assistantKind: Message["kind"] | undefined
      let suggestionIds: string[] | undefined
      let pendingCampaignId: string | undefined
      let doneState: string | undefined

      const updateAssistant = (patch: Partial<Message>) => {
        setMessages((prev) => prev.map((m) => (m.id === assistantMessageId ? { ...m, ...patch } : m)))
      }

      while (true) {
        const { value: chunk, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(chunk, { stream: true })
        const frames = buffer.split("\n\n")
        buffer = frames.pop() ?? ""

        for (const frame of frames) {
          const dataLine = frame.split("\n").map((l) => l.trim()).find((l) => l.startsWith("data:"))
          if (!dataLine) continue
          let event: AiStreamEvent | null = null
          try { event = JSON.parse(dataLine.slice(5).trim()) as AiStreamEvent } catch { event = null }
          if (!event) continue

          if (event.type === "session") {
            activeConversationId = event.conversationId
            setConversationId(event.conversationId)
            setWorkflowState(event.state)
          } else if (event.type === "state_patch") {
            setWorkflowState(event.state)
            if (event.state === "AUDIENCE_COLLECTION" || event.state === "VALIDATION_REVIEW") setComposerMode("emails")
            if (event.selectedTemplateId) {
              const t = templateOptions.find((e) => e.id === event.selectedTemplateId)
              if (t) { applyTemplateSelection(t, false); assistantKind = "templateReview" }
            }
          } else if (event.type === "tool_result") {
            if (event.result.templateSuggestions?.length) { suggestionIds = event.result.templateSuggestions.map((t) => t.id); assistantKind = "suggestions" }
            if (event.result.campaignId) pendingCampaignId = event.result.campaignId
          } else if (event.type === "token") {
            streamedText += event.token
            updateAssistant({ text: streamedText, kind: assistantKind, templateSuggestionIds: suggestionIds, campaignId: pendingCampaignId })
          } else if (event.type === "moderation") {
            setMessages((prev) => [...prev, { id: Date.now() + 3, role: "bot", text: event.message }])
          } else if (event.type === "done") {
            doneState = event.state
            activeConversationId = event.conversationId
            setConversationId(event.conversationId)
            setWorkflowState(event.state)
            if (event.selectedTemplateId) {
              const t = templateOptions.find((e) => e.id === event.selectedTemplateId)
              if (t) { applyTemplateSelection(t, false); assistantKind = "templateReview" }
            }
            if (event.templateSuggestions?.length) { suggestionIds = event.templateSuggestions.map((t) => t.id); assistantKind = "suggestions" }
            if (event.state === "AUDIENCE_COLLECTION") { setComposerMode("emails"); assistantKind = assistantKind ?? "emailRequest" }
            if (event.state === "VALIDATION_REVIEW") { setComposerMode("emails"); assistantKind = assistantKind ?? "validation" }
            pendingCampaignId = event.campaignId ?? pendingCampaignId
            streamedText = event.text || streamedText
            updateAssistant({ text: streamedText || "Done.", kind: assistantKind, templateSuggestionIds: suggestionIds, campaignId: pendingCampaignId })
          } else if (event.type === "error") {
            throw new Error(event.error)
          }
        }
      }

      if (streamedText) {
        void persistMessage({ role: "ASSISTANT", content: streamedText, conversationId: activeConversationId, metadata: { kind: assistantKind, templateSuggestionIds: suggestionIds, campaignId: pendingCampaignId } })
      }

      if (doneState === "QUEUED") {
        onQueued(pendingCampaignId ?? `cmp-${Date.now().toString().slice(-8)}`, 0, "")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not generate an AI response."
      setMessages((prev) => {
        let replaced = false
        const next = prev.map((entry) => { if (entry.id !== assistantMessageId) return entry; replaced = true; return { ...entry, text: `AI error: ${message}` } })
        if (replaced) return next
        return [...next, { id: Date.now() + 2, role: "bot", text: `AI error: ${message}` }]
      })
    } finally {
      setIsAiResponding(false)
    }
  }

  return { streamPrompt }
}
