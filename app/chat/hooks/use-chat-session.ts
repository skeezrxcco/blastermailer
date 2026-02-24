"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"

import { buildEditorData, templateOptions, type TemplateEditorData, type TemplateOption } from "@/components/shared/newsletter/template-data"
import { confirmedTemplateNotice, initialChatMessages, selectedTemplateNotice } from "@/app/chat/chat-page.data"
import { loadConversationMessages } from "@/app/chat/chat-page.utils"
import type { ChatSessionSummary, DishKey, EditorThemeState, Message } from "@/app/chat/chat-page.types"

function createThemeState(template: TemplateOption): EditorThemeState {
  return {
    accentA: template.accentA,
    accentB: template.accentB,
    surface: template.surface,
    ctaBg: template.ctaBg,
    ctaText: template.ctaText,
    dishOneImage: template.dishOneImage,
    dishTwoImage: template.dishTwoImage,
  }
}

export function useChatSession() {
  const searchParams = useSearchParams()
  const initializedFromTemplateRef = useRef(false)

  const templateParam = searchParams.get("template")
  const newChatParam = searchParams.get("newChat")
  const conversationIdParam = searchParams.get("conversationId")

  const [messages, setMessages] = useState<Message[]>(initialChatMessages)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption | null>(null)
  const [templateData, setTemplateData] = useState<TemplateEditorData | null>(null)
  const [themeState, setThemeState] = useState<EditorThemeState | null>(null)
  const [dishOrder, setDishOrder] = useState<DishKey[]>(["one", "two"])
  const [composerMode, setComposerMode] = useState<"prompt" | "emails">("prompt")
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [workflowState, setWorkflowState] = useState<string>("INTENT_CAPTURE")

  const applyTemplateSelection = (template: TemplateOption, announce = true) => {
    setSelectedTemplate(template)
    setTemplateData(buildEditorData(template.theme, template))
    setThemeState(createThemeState(template))
    setDishOrder(["one", "two"])
    setComposerMode("prompt")
    if (announce) {
      setMessages((prev) => {
        const withoutOldReviews = prev.filter((m) => m.kind !== "templateReview")
        return [...withoutOldReviews, { id: crypto.randomUUID(), role: "bot", text: confirmedTemplateNotice(template.name), kind: "templateReview" }]
      })
    }
  }

  const clearConversationWorkspace = () => {
    setMessages([])
    setSelectedTemplate(null)
    setTemplateData(null)
    setThemeState(null)
    setDishOrder(["one", "two"])
    setComposerMode("prompt")
    setWorkflowState("INTENT_CAPTURE")
  }

  const applySessionToUi = async (session: ChatSessionSummary, options?: { injectSummaryMessage?: boolean }) => {
    setConversationId(session.conversationId)
    setWorkflowState(session.state || "INTENT_CAPTURE")
    setComposerMode(session.state === "AUDIENCE_COLLECTION" || session.state === "VALIDATION_REVIEW" ? "emails" : "prompt")

    if (session.selectedTemplateId) {
      const template = templateOptions.find((entry) => entry.id === session.selectedTemplateId)
      if (template) applyTemplateSelection(template, false)
    } else {
      setSelectedTemplate(null)
      setTemplateData(null)
      setThemeState(null)
    }

    const loaded = await loadConversationMessages(session.conversationId)
    if (loaded.length > 0) {
      setMessages(loaded)
    } else if (options?.injectSummaryMessage) {
      const summary = session.summary?.trim()
      setMessages(
        summary
          ? [{ id: crypto.randomUUID(), role: "bot", text: summary }]
          : [{ id: crypto.randomUUID(), role: "bot", text: "Conversation loaded. Tell me what you want to do next." }],
      )
    }
  }

  const loadSessionSnapshot = async (targetConversationId?: string | null) => {
    const query = targetConversationId ? `?conversationId=${encodeURIComponent(targetConversationId)}` : ""
    const response = await fetch(`/api/ai/session${query}`, { method: "GET", cache: "no-store" })
    if (!response.ok) return null
    const payload = (await response.json()) as { session?: ChatSessionSummary | null }
    return payload.session ?? null
  }

  useEffect(() => {
    if (initializedFromTemplateRef.current) return
    if (!templateParam) return
    const template = templateOptions.find((item) => item.id === templateParam)
    if (!template) return
    initializedFromTemplateRef.current = true
    applyTemplateSelection(template, false)
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "bot", text: selectedTemplateNotice(template.name), kind: "templateReview" }])
  }, [templateParam])

  useEffect(() => {
    if (newChatParam !== "1") return
    setMessages([])
    setSelectedTemplate(null)
    setTemplateData(null)
    setThemeState(null)
    setDishOrder(["one", "two"])
    setComposerMode("prompt")
    setWorkflowState("INTENT_CAPTURE")
    setConversationId(null)
  }, [newChatParam])

  useEffect(() => {
    let cancelled = false
    const hydrateSession = async () => {
      try {
        if (newChatParam === "1") return
        if (conversationIdParam && conversationId === conversationIdParam && messages.length > 0) return
        if (!conversationIdParam) {
          if (!templateParam) {
            setMessages([])
            setSelectedTemplate(null)
            setTemplateData(null)
            setThemeState(null)
            setDishOrder(["one", "two"])
            setComposerMode("prompt")
            setWorkflowState("INTENT_CAPTURE")
            setConversationId(null)
          }
          return
        }

        const session = await loadSessionSnapshot(conversationIdParam)
        if (session && !cancelled) {
          await applySessionToUi(session, { injectSummaryMessage: true })
          return
        }

        if (!cancelled) {
          setMessages([])
          setSelectedTemplate(null)
          setTemplateData(null)
          setThemeState(null)
          setDishOrder(["one", "two"])
          setComposerMode("prompt")
          setWorkflowState("INTENT_CAPTURE")
          setConversationId(null)
        }
      } catch { /* Ignore */ }
    }
    void hydrateSession()
    return () => { cancelled = true }
  }, [conversationId, conversationIdParam, messages.length, newChatParam, templateParam])

  return {
    messages, setMessages,
    selectedTemplate, setSelectedTemplate,
    templateData, setTemplateData,
    themeState, setThemeState,
    dishOrder, setDishOrder,
    composerMode, setComposerMode,
    conversationId, setConversationId,
    workflowState, setWorkflowState,
    applyTemplateSelection,
    clearConversationWorkspace,
    applySessionToUi,
  }
}
