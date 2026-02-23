"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { buildEditorData, type TemplateEditorData, type TemplateOption } from "@/components/shared/newsletter/template-data"
import { WorkspaceShell } from "@/components/shared/workspace/app-shell"
import { useAiCredits } from "@/hooks/use-ai-credits"
import { type SessionUserSummary } from "@/types/session-user"

import type { DishKey, EditorThemeState, PreviewMode } from "@/app/chat/chat-page.types"
import { computeValidationStats } from "@/app/chat/chat-page.utils"
import { AssistantSignal, CsvSheetSkeleton } from "@/app/chat/chat-message-list"
import { TemplatePreviewModal, TemplateEditorModal } from "@/app/chat/chat-template-modals"
import { ChatComposerBar } from "@/app/chat/chat-composer-bar"
import { MessageList } from "@/app/chat/chat-message-list-view"
import { useChatSession } from "@/app/chat/hooks/use-chat-session"
import { useChatStream } from "@/app/chat/hooks/use-chat-stream"
import { useChatEmail } from "@/app/chat/hooks/use-chat-email"
import { useCampaignSend } from "@/app/chat/hooks/use-campaign-send"
import { chatHeroSubtitle, chatHeroTitle } from "@/app/chat/chat-page.data"

export function ChatPageClient({ initialUser }: { initialUser: SessionUserSummary }) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const csvFileInputRef = useRef<HTMLInputElement | null>(null)

  const isPaidPlan = initialUser.plan === "pro" || initialUser.plan === "premium" || initialUser.plan === "enterprise"
  const aiQuota = useAiCredits()
  const isOutOfCredits = aiQuota.exhausted

  const [prompt, setPrompt] = useState("")
  const [isAiResponding, setIsAiResponding] = useState(false)
  const [selectedModelChoice, setSelectedModelChoice] = useState<string>("fast")
  const [selectedSpecificModel, setSelectedSpecificModel] = useState<string | null>(null)
  const [previewViewport, setPreviewViewport] = useState<PreviewMode>("desktop")
  const [editorViewport, setEditorViewport] = useState<PreviewMode>("desktop")
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [previewOnlyTemplate, setPreviewOnlyTemplate] = useState<TemplateOption | null>(null)
  const [previewOnlyData, setPreviewOnlyData] = useState<TemplateEditorData | null>(null)
  const [previewOnlyTheme, setPreviewOnlyTheme] = useState<EditorThemeState | null>(null)

  const session = useChatSession(isAiResponding)
  const { streamPrompt } = useChatStream()
  const email = useChatEmail(session.setMessages, session.composerMode, session.setComposerMode)
  const { confirmSendCampaign } = useCampaignSend(session.setMessages, session.setComposerMode)

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
        return [...prev, { id: Date.now() + 1, role: "bot", text: msg }]
      })
      return
    }

    if (session.composerMode === "emails") {
      email.handleEmailTextInput(value, setPrompt)
      return
    }

    const assistantMessageId = Date.now() + 1
    session.setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", text: value },
      { id: assistantMessageId, role: "bot", text: "" },
    ])
    setPrompt("")

    await streamPrompt(value, assistantMessageId, {
      isPaidPlan,
      conversationId: session.conversationId,
      selectedModelChoice,
      selectedSpecificModel,
      setConversationId: session.setConversationId,
      setWorkflowState: session.setWorkflowState,
      setComposerMode: session.setComposerMode,
      setMessages: session.setMessages,
      setIsAiResponding,
      applyTemplateSelection: session.applyTemplateSelection,
      onQueued: (campaignId, _, templateName) => {
        const validAudience = computeValidationStats(email.emailEntries).valid
        router.push(
          `/campaigns?campaign=${campaignId}&template=${encodeURIComponent(session.selectedTemplate?.name ?? templateName ?? "Campaign")}&audience=${validAudience}`,
        )
      },
    })
  }

  const showHero = session.messages.length === 0 && session.workflowState === "INTENT_CAPTURE" && !isAiResponding
  const canUploadCsv = session.composerMode === "emails" && !email.isCsvProcessing && !isOutOfCredits

  const composer = (
    <ChatComposerBar
      prompt={prompt}
      onPromptChange={setPrompt}
      onSend={sendPrompt}
      composerMode={session.composerMode}
      isOutOfCredits={isOutOfCredits}
      isPaidPlan={isPaidPlan}
      canUploadCsv={canUploadCsv}
      csvFileInputRef={csvFileInputRef}
      onCsvFileChange={(file) => email.processCsvFile(file, csvFileInputRef)}
      selectedModelChoice={selectedModelChoice}
      selectedSpecificModel={selectedSpecificModel}
      onModelChoiceChange={setSelectedModelChoice}
      onSpecificModelChange={setSelectedSpecificModel}
      showHero={showHero}
    />
  )

  return (
    <WorkspaceShell tab="chat" pageTitle="Chat" user={initialUser}>
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden" data-workflow-state={session.workflowState}>
        {showHero ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4">
            <h1 className="text-center text-3xl font-medium text-zinc-100 md:text-5xl">{chatHeroTitle}</h1>
            <p className="mt-4 max-w-2xl text-center text-sm text-zinc-400 md:text-base">{chatHeroSubtitle}</p>
            <div className="mt-8 w-full max-w-4xl">{composer}</div>
          </div>
        ) : (
          <>
            <div
              data-workspace-scroll
              className="scrollbar-hide min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5 md:px-6 md:py-6"
              ref={containerRef}
            >
              <MessageList
                messages={session.messages}
                emailEntries={email.emailEntries}
                selectedTemplate={session.selectedTemplate}
                templateData={session.templateData}
                isPaidPlan={isPaidPlan}
                onPreviewTemplate={(template) => {
                  setPreviewOnlyTemplate(template)
                  setPreviewOnlyData(buildEditorData(template.theme, template))
                  setPreviewOnlyTheme({ accentA: template.accentA, accentB: template.accentB, surface: template.surface, ctaBg: template.ctaBg, ctaText: template.ctaText, dishOneImage: template.dishOneImage, dishTwoImage: template.dishTwoImage })
                  setPreviewViewport("desktop")
                  setIsPreviewOpen(true)
                }}
                onSelectTemplate={(template) => session.applyTemplateSelection(template, true)}
                onEditTemplate={() => { setEditorViewport("desktop"); setIsEditorOpen(true) }}
                onChangeTemplate={() => {
                  session.setSelectedTemplate(null)
                  session.setTemplateData(null)
                  session.setThemeState(null)
                  email.clearEmailEntries()
                  session.setComposerMode("prompt")
                  const hasSuggestions = session.messages.some((m) => m.kind === "suggestions")
                  if (!hasSuggestions) {
                    session.setMessages((prev) => [...prev, { id: Date.now(), role: "bot", text: "No problem. Pick another template below.", kind: "suggestions" }])
                    return
                  }
                  window.setTimeout(() => scrollToExistingSuggestions(), 60)
                }}
                onContinueToEmails={email.requestEmails}
                onEditEmailEntry={email.updateEmailEntry}
                onRemoveEmailEntry={email.removeEmailEntry}
                onConfirmSend={() => confirmSendCampaign(email.emailEntries, session.selectedTemplate, session.templateData)}
              />
              {email.isCsvProcessing ? <CsvSheetSkeleton /> : null}
              {isAiResponding ? <AssistantSignal /> : null}
            </div>
            <div className="p-3 pt-0 md:p-4 md:pt-0">{composer}</div>
          </>
        )}
      </div>

      {isPreviewOpen && (previewOnlyTemplate ?? session.selectedTemplate) && (previewOnlyData ?? session.templateData) && (previewOnlyTheme ?? session.themeState) ? (
        <TemplatePreviewModal
          template={(previewOnlyTemplate ?? session.selectedTemplate)!}
          data={(previewOnlyData ?? session.templateData)!}
          theme={(previewOnlyTheme ?? session.themeState)!}
          dishOrder={session.dishOrder}
          viewport={previewViewport}
          onViewportChange={setPreviewViewport}
          onClose={() => {
            setIsPreviewOpen(false)
            setPreviewOnlyTemplate(null)
            setPreviewOnlyData(null)
            setPreviewOnlyTheme(null)
          }}
        />
      ) : null}

      {isEditorOpen && session.selectedTemplate && session.templateData && session.themeState ? (
        <TemplateEditorModal
          template={session.selectedTemplate}
          data={session.templateData}
          onDataChange={(field, value) => session.setTemplateData((prev) => (prev ? { ...prev, [field]: value } : prev))}
          theme={session.themeState}
          onThemeChange={(patch) => session.setThemeState((prev) => (prev ? { ...prev, ...patch } : prev))}
          dishOrder={session.dishOrder}
          onSwapDish={(source, target) => {
            session.setDishOrder((prev) => {
              const si = prev.indexOf(source)
              const ti = prev.indexOf(target)
              if (si < 0 || ti < 0) return prev
              const next = [...prev]
              ;[next[si], next[ti]] = [next[ti], next[si]]
              return next
            })
          }}
          viewport={editorViewport}
          onViewportChange={setEditorViewport}
          onClose={() => setIsEditorOpen(false)}
        />
      ) : null}
    </WorkspaceShell>
  )
}
