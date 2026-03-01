"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { WorkspaceShell } from "@/components/shared/workspace/app-shell"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { useAiCredits } from "@/hooks/use-ai-credits"
import { useAiModels } from "@/hooks/use-ai-models"
import { type SessionUserSummary } from "@/types/session-user"

import type { ChatAttachment } from "@/app/chat/chat-page.types"
import { modelChoices } from "@/app/chat/chat-page.types"
import { AssistantSignal, CsvSheetSkeleton } from "@/app/chat/chat-message-list"
import { TemplateSidePanel } from "@/app/chat/chat-template-side-panel"
import { ChatComposerBar } from "@/app/chat/chat-composer-bar"
import { MessageList } from "@/app/chat/chat-message-list-view"
import { useChatSession } from "@/app/chat/hooks/use-chat-session"
import { useChatStream } from "@/app/chat/hooks/use-chat-stream"
import { useChatEmail } from "@/app/chat/hooks/use-chat-email"
import { useCampaignSend } from "@/app/chat/hooks/use-campaign-send"
import { chatHeroSubtitle, chatHeroTitle } from "@/app/chat/chat-page.data"

const PREVIEW_LAYOUT_STORAGE_KEY = "bm:chat:template-panel-layout:v2"
const CHAT_DRAFT_STORAGE_PREFIX = "bm:chat:draft:"

export function ChatPageClient({ initialUser }: { initialUser: SessionUserSummary }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const isPaidPlan = initialUser.plan === "pro" || initialUser.plan === "premium" || initialUser.plan === "enterprise"
  const aiQuota = useAiCredits()
  const isOutOfCredits = aiQuota.exhausted

  const [prompt, setPrompt] = useState("")
  const [isAiResponding, setIsAiResponding] = useState(false)
  const [selectedModelChoice, setSelectedModelChoice] = useState<string>("fast")
  const aiModels = useAiModels()
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([])
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null)
  const [generatedSubject, setGeneratedSubject] = useState<string | null>(null)
  const [isTemplatePanelOpen, setIsTemplatePanelOpen] = useState(false)
  const [isResizingPanels, setIsResizingPanels] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const lastGeneratedMessageIdRef = useRef<string | number | null>(null)
  const [previewPanelLayout, setPreviewPanelLayout] = useState<{ "chat-pane": number; "preview-pane": number } | null>(null)
  const skipNextDraftSaveRef = useRef(false)

  const conversationIdParam = searchParams.get("conversationId")
  const isNewChatRoute = searchParams.get("newChat") === "1"
  const activeDraftStorageKey = conversationIdParam
    ? `${CHAT_DRAFT_STORAGE_PREFIX}${conversationIdParam}`
    : isNewChatRoute
      ? `${CHAT_DRAFT_STORAGE_PREFIX}new`
      : `${CHAT_DRAFT_STORAGE_PREFIX}root`

  const nextId = useCallback(() => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }, [])

  const session = useChatSession()
  const { streamPrompt } = useChatStream()
  const email = useChatEmail(session.setMessages, session.composerMode, session.setComposerMode)
  const { confirmSendCampaign } = useCampaignSend(session.setMessages, session.setComposerMode)

  // Auto-scroll: position the bot response near the top of the viewport
  const prevRespondingRef = useRef(false)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const justStartedResponding = isAiResponding && !prevRespondingRef.current
    prevRespondingRef.current = isAiResponding

    requestAnimationFrame(() => {
      if (justStartedResponding) {
        // Find the last bot message (the empty one just added) and scroll it near the top
        const botMessages = container.querySelectorAll<HTMLElement>('[class*="justify-start"]')
        const lastBot = botMessages[botMessages.length - 1]
        if (lastBot) {
          const containerRect = container.getBoundingClientRect()
          const botRect = lastBot.getBoundingClientRect()
          // Position the bot response ~15% from the top of the visible area
          const targetOffset = containerRect.height * 0.15
          const scrollTarget = botRect.top - containerRect.top + container.scrollTop - targetOffset
          container.scrollTo({ top: Math.max(0, scrollTarget), behavior: "smooth" })
          return
        }
      }

      if (isAiResponding) {
        // While streaming, keep the bottom of the content visible but don't jump aggressively
        const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
        if (distFromBottom < 300) {
          container.scrollTo({ top: container.scrollHeight, behavior: "smooth" })
        }
        return
      }

      // Not responding: gentle scroll to bottom for new content
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" })
    })
  }, [session.messages, isAiResponding])

  useEffect(() => {
    let storedDraft = ""
    try {
      storedDraft = window.localStorage.getItem(activeDraftStorageKey) ?? ""
    } catch {
      storedDraft = ""
    }
    skipNextDraftSaveRef.current = true
    setPrompt(storedDraft)
  }, [activeDraftStorageKey])

  useEffect(() => {
    if (skipNextDraftSaveRef.current) {
      skipNextDraftSaveRef.current = false
      return
    }
    try {
      if (!prompt.trim()) {
        window.localStorage.removeItem(activeDraftStorageKey)
      } else {
        window.localStorage.setItem(activeDraftStorageKey, prompt)
      }
    } catch {
      // Ignore draft persistence issues.
    }
  }, [prompt, activeDraftStorageKey])

  useEffect(() => {
    const latestGeneratedMessage = [...session.messages].reverse().find((message) => typeof message.generatedHtml === "string")
    if (!latestGeneratedMessage) {
      if (session.messages.length === 0) {
        setGeneratedHtml(null)
        setGeneratedSubject(null)
        setIsTemplatePanelOpen(false)
        lastGeneratedMessageIdRef.current = null
      }
      return
    }

    if (lastGeneratedMessageIdRef.current === latestGeneratedMessage.id) return
    lastGeneratedMessageIdRef.current = latestGeneratedMessage.id
    setGeneratedHtml(latestGeneratedMessage.generatedHtml ?? null)
    setGeneratedSubject(latestGeneratedMessage.generatedSubject ?? null)
    setIsTemplatePanelOpen(Boolean(latestGeneratedMessage.generatedHtml))
  }, [session.messages])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PREVIEW_LAYOUT_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as { "chat-pane"?: unknown; "preview-pane"?: unknown }
      const chat = Number(parsed["chat-pane"])
      const preview = Number(parsed["preview-pane"])
      if (!Number.isFinite(chat) || !Number.isFinite(preview)) return
      const total = chat + preview
      if (total < 99 || total > 101) return
      setPreviewPanelLayout({ "chat-pane": chat, "preview-pane": preview })
    } catch {
      // Ignore invalid stored layout
    }
  }, [])

  useEffect(() => {
    if (!isResizingPanels) return
    const stopResizing = () => setIsResizingPanels(false)
    window.addEventListener("pointerup", stopResizing)
    window.addEventListener("pointercancel", stopResizing)
    window.addEventListener("blur", stopResizing)
    return () => {
      window.removeEventListener("pointerup", stopResizing)
      window.removeEventListener("pointercancel", stopResizing)
      window.removeEventListener("blur", stopResizing)
    }
  }, [isResizingPanels])

  const scrollToExistingSuggestions = () => {
    const container = containerRef.current
    if (!container) return false
    const nodes = container.querySelectorAll<HTMLElement>('[data-message-kind="suggestions"]')
    const last = nodes[nodes.length - 1]
    if (!last) return false
    last.scrollIntoView({ behavior: "smooth", block: "start" })
    return true
  }

  const sendPrompt = async () => {
    const value = prompt.trim()
    if (!value || isAiResponding) return

    if (isOutOfCredits) {
      const msg = isPaidPlan
        ? "You've used your monthly quota. It resets at the start of next month."
        : "You've used your monthly quota. Upgrade to Pro for a larger allowance."
      session.setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (last?.role === "bot" && last.text === msg) return prev
        return [...prev, { id: nextId(), role: "bot", text: msg }]
      })
      return
    }

    if (session.composerMode === "emails") {
      email.handleEmailTextInput(value, setPrompt)
      return
    }

    const userMsgId = nextId()
    const assistantMessageId = nextId()
    let requestConversationId = session.conversationId ?? conversationIdParam
    if (!requestConversationId) {
      requestConversationId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `conv-${Date.now().toString(36)}`
      session.setConversationId(requestConversationId)
    }

    const currentAttachments = pendingAttachments.length > 0 ? [...pendingAttachments] : undefined
    session.setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", text: value, attachments: currentAttachments },
      { id: assistantMessageId, role: "bot", text: "" },
    ])
    setPrompt("")
    setPendingAttachments([])

    await streamPrompt(value, assistantMessageId, {
      isPaidPlan,
      conversationId: requestConversationId,
      selectedModelChoice,
      selectedSpecificModel: null,
      setConversationId: session.setConversationId,
      setWorkflowState: session.setWorkflowState,
      setComposerMode: session.setComposerMode,
      setMessages: session.setMessages,
      setIsAiResponding,
      applyTemplateSelection: session.applyTemplateSelection,
      onQueued: () => {},
      onConversationReady: (nextConversationId) => {
        if (!searchParams.get("conversationId")) {
          router.replace(`/chat?conversationId=${encodeURIComponent(nextConversationId)}`)
        }
      },
      onGeneratedHtml: (html, subject) => {
        setGeneratedHtml(html)
        setGeneratedSubject(subject)
        setIsTemplatePanelOpen(true)
      },
    })
  }

  const showHero = session.messages.length === 0 && session.workflowState === "INTENT_CAPTURE" && !isAiResponding
  const canUpload = !email.isCsvProcessing && !isOutOfCredits

  const handleCsvFile = (file: File) => {
    email.processCsvFile(file, { current: null })
  }

  const handleDocumentFile = (file: File) => {
    const attachment: ChatAttachment = {
      id: crypto.randomUUID(),
      file,
      type: "document",
      name: file.name,
    }
    setPendingAttachments((prev) => [...prev, attachment])
  }

  const handleImageFiles = (files: File[]) => {
    const attachments: ChatAttachment[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      type: "image" as const,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
    }))
    setPendingAttachments((prev) => [...prev, ...attachments])
  }

  const handleRemoveAttachment = (id: string) => {
    setPendingAttachments((prev) => {
      const removed = prev.find((a) => a.id === id)
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((a) => a.id !== id)
    })
  }

  const composer = (
    <ChatComposerBar
      prompt={prompt}
      onPromptChange={setPrompt}
      onSend={sendPrompt}
      composerMode={session.composerMode}
      isOutOfCredits={isOutOfCredits}
      isPaidPlan={isPaidPlan}
      canUpload={canUpload}
      onCsvFile={handleCsvFile}
      onDocumentFile={handleDocumentFile}
      onImageFiles={handleImageFiles}
      selectedModelChoice={selectedModelChoice}
      onModelChoiceChange={setSelectedModelChoice}
      showHero={showHero}
      pendingAttachments={pendingAttachments}
      onRemoveAttachment={handleRemoveAttachment}
      availableModes={aiModels.modes}
      highlightUploadAction={session.composerMode === "emails" && email.emailEntries.length === 0 && canUpload}
    />
  )

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true) }
  const handleDragLeave = (e: React.DragEvent) => { if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false) }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"))
    if (files.length > 0) handleImageFiles(files)
  }

  return (
    <WorkspaceShell tab="chat" pageTitle="Chat" user={initialUser} activeModelLabel={(() => {
      const choice = modelChoices.find((c) => c.id === selectedModelChoice) ?? modelChoices[0]
      const modeInfo = aiModels.modes.find((m) => m.mode === choice.mode)
      return modeInfo?.modelLabel ?? choice.label
    })()}>
      <div
        className="relative flex h-full min-h-0 flex-col overflow-hidden"
        data-workflow-state={session.workflowState}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragOver ? (
          <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center rounded-2xl border-2 border-dashed border-sky-400/50 bg-zinc-950/80 backdrop-blur-sm">
            <p className="text-sm font-medium text-sky-300">Drop images here</p>
          </div>
        ) : null}
        {showHero ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4">
            <h1 className="text-center text-3xl font-medium text-zinc-100 md:text-5xl">{chatHeroTitle}</h1>
            <p className="mt-4 max-w-2xl text-center text-sm text-zinc-400 md:text-base">{chatHeroSubtitle}</p>
            <div className="mt-8 w-full max-w-4xl">{composer}</div>
          </div>
        ) : (
          generatedHtml && isTemplatePanelOpen ? (
            <ResizablePanelGroup
              orientation="horizontal"
              className="min-h-0 flex-1 overflow-hidden"
              resizeTargetMinimumSize={{ fine: 18, coarse: 32 }}
              defaultLayout={previewPanelLayout ?? { "chat-pane": 66, "preview-pane": 34 }}
              onLayoutChanged={(layout) => {
                const chat = layout["chat-pane"]
                const preview = layout["preview-pane"]
                if (typeof chat !== "number" || typeof preview !== "number") return
                const next = { "chat-pane": chat, "preview-pane": preview }
                setPreviewPanelLayout(next)
                try {
                  window.localStorage.setItem(PREVIEW_LAYOUT_STORAGE_KEY, JSON.stringify(next))
                } catch {
                  // Ignore storage errors
                }
              }}
            >
              <ResizablePanel id="chat-pane" minSize="40%">
                <div className="flex min-h-0 h-full flex-1 flex-col">
                  <div
                    data-workspace-scroll
                    className="scrollbar-hide min-h-0 flex-1 space-y-4 overflow-y-auto scroll-smooth px-4 py-5 md:px-8 md:py-6"
                    ref={containerRef}
                  >
                    <div className="mx-auto w-full max-w-3xl space-y-4">
                      <MessageList
                        messages={session.messages}
                        emailEntries={email.emailEntries}
                        selectedTemplate={session.selectedTemplate}
                        templateData={session.templateData}
                        isPaidPlan={isPaidPlan}
                        onSelectTemplate={(template) => session.applyTemplateSelection(template, true)}
                        onChangeTemplate={() => {
                          session.setSelectedTemplate(null)
                          session.setTemplateData(null)
                          session.setThemeState(null)
                          email.clearEmailEntries()
                          session.setComposerMode("prompt")
                          const hasSuggestions = session.messages.some((m) => m.kind === "suggestions")
                          if (!hasSuggestions) {
                            session.setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "bot", text: "No problem. Pick another template below.", kind: "suggestions" }])
                            return
                          }
                          window.setTimeout(() => scrollToExistingSuggestions(), 60)
                        }}
                        onContinueToEmails={email.requestEmails}
                        onEditEmailEntry={email.updateEmailEntry}
                        onRemoveEmailEntry={email.removeEmailEntry}
                        onConfirmSend={() =>
                          confirmSendCampaign({
                            emailEntries: email.emailEntries,
                            selectedTemplate: session.selectedTemplate,
                            templateData: session.templateData,
                            themeState: session.themeState,
                            generatedHtml,
                            generatedSubject,
                          })
                        }
                      />
                      {email.isCsvProcessing ? <CsvSheetSkeleton /> : null}
                      {isAiResponding ? <AssistantSignal /> : null}
                    </div>
                  </div>
                  <div className="mx-auto w-full max-w-3xl p-3 pt-0 md:px-8 md:pb-4 md:pt-0">{composer}</div>
                </div>
              </ResizablePanel>
              <ResizableHandle
                withHandle
                onPointerDown={() => setIsResizingPanels(true)}
                className="bg-zinc-800/70 transition-colors hover:bg-zinc-700/80"
              />
              <ResizablePanel id="preview-pane" minSize="24%" maxSize="60%">
                <div className="h-full min-h-0 min-w-0 overflow-hidden">
                  <TemplateSidePanel
                    html={generatedHtml}
                    subject={generatedSubject}
                    disablePreviewInteraction={isResizingPanels}
                  />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <div className="flex min-h-0 flex-1 flex-col">
                <div
                  data-workspace-scroll
                  className="scrollbar-hide min-h-0 flex-1 space-y-4 overflow-y-auto scroll-smooth px-4 py-5 md:px-8 md:py-6"
                  ref={containerRef}
                >
                  <div className="mx-auto w-full max-w-3xl space-y-4">
                    <MessageList
                      messages={session.messages}
                      emailEntries={email.emailEntries}
                      selectedTemplate={session.selectedTemplate}
                      templateData={session.templateData}
                      isPaidPlan={isPaidPlan}
                      onSelectTemplate={(template) => session.applyTemplateSelection(template, true)}
                      onChangeTemplate={() => {
                        session.setSelectedTemplate(null)
                        session.setTemplateData(null)
                        session.setThemeState(null)
                        email.clearEmailEntries()
                        session.setComposerMode("prompt")
                        const hasSuggestions = session.messages.some((m) => m.kind === "suggestions")
                        if (!hasSuggestions) {
                          session.setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "bot", text: "No problem. Pick another template below.", kind: "suggestions" }])
                          return
                        }
                        window.setTimeout(() => scrollToExistingSuggestions(), 60)
                      }}
                      onContinueToEmails={email.requestEmails}
                      onEditEmailEntry={email.updateEmailEntry}
                      onRemoveEmailEntry={email.removeEmailEntry}
                      onConfirmSend={() =>
                        confirmSendCampaign({
                          emailEntries: email.emailEntries,
                          selectedTemplate: session.selectedTemplate,
                          templateData: session.templateData,
                          themeState: session.themeState,
                          generatedHtml,
                          generatedSubject,
                        })
                      }
                    />
                    {email.isCsvProcessing ? <CsvSheetSkeleton /> : null}
                    {isAiResponding ? <AssistantSignal /> : null}
                  </div>
                </div>
                <div className="mx-auto w-full max-w-3xl p-3 pt-0 md:px-8 md:pb-4 md:pt-0">{composer}</div>
              </div>
            </div>
          )
        )}
      </div>
    </WorkspaceShell>
  )
}
