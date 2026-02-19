"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { EyeIcon } from "@/components/ui/eye"
import {
  chatCopy,
  confirmedTemplateNotice,
  initialChatMessages,
  selectedTemplateNotice,
  type ChatMessageSeed,
} from "@/app/chat/chat-page.data"
import { TemplatePreview } from "@/components/shared/newsletter/template-preview"
import { WorkspaceShell } from "@/components/shared/workspace/app-shell"
import { buildEditorData, templateOptions, type TemplateOption } from "@/components/shared/newsletter/template-data"
import { cn } from "@/lib/utils"

type Message = ChatMessageSeed

function TemplateSuggestionCard({
  template,
  selected,
  onPreview,
  onSelect,
}: {
  template: TemplateOption
  selected: boolean
  onPreview: () => void
  onSelect: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const [cardHovered, setCardHovered] = useState(false)
  const previewData = buildEditorData(template.theme, template)

  return (
    <Card
      className="h-[390px] w-[282px] shrink-0 rounded-[24px] border-0 bg-zinc-950/55 p-0 sm:w-[312px]"
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
    >
      <CardContent className="flex h-full flex-col p-3">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-zinc-100">{template.name}</p>
            <p className="text-xs text-zinc-400">
              {template.theme} · {template.audience}
            </p>
          </div>
          {selected ? <Badge className="rounded-full bg-emerald-500/20 text-emerald-200">Selected</Badge> : null}
        </div>

        <TemplatePreview template={template} data={previewData} heightClass="h-44" autoScroll={cardHovered} />

        <p className="mt-2 text-xs leading-relaxed text-zinc-300">{template.description}</p>
        <p className="text-[11px] uppercase tracking-wide text-zinc-500">{template.tone}</p>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
          <Button
            size="sm"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="rounded-xl bg-zinc-900/80 text-zinc-100 hover:bg-zinc-800"
            onClick={onPreview}
          >
            <EyeIcon size={14} className={cn("h-3.5 w-3.5", hovered ? "text-zinc-100" : "text-zinc-300")} />
          </Button>
          <Button
            size="sm"
            onClick={onSelect}
            className={cn(
              "rounded-xl",
              selected ? "bg-zinc-800 text-zinc-100 hover:bg-zinc-800" : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
            )}
          >
            {selected ? "Selected" : "Select"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function AnimatedBotText({ text }: { text: string }) {
  const [visible, setVisible] = useState("")
  const animatedRef = useRef(false)

  useEffect(() => {
    if (animatedRef.current) {
      setVisible(text)
      return
    }
    animatedRef.current = true
    setVisible("")

    let index = 0
    const timer = window.setInterval(() => {
      index += 1
      setVisible(text.slice(0, index))
      if (index >= text.length) {
        window.clearInterval(timer)
      }
    }, 11)

    return () => window.clearInterval(timer)
  }, [text])

  return <p className="leading-relaxed">{visible}</p>
}

function ActivityBubble({ label }: { label: string }) {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl bg-zinc-900/90 px-3 py-2 text-xs text-zinc-300">
        <div className="flex items-center gap-2">
          {label}
          <span className="inline-flex gap-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-300" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-300 [animation-delay:120ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-300 [animation-delay:240ms]" />
          </span>
        </div>
      </div>
    </div>
  )
}

export function ChatPageClient() {
  const searchParams = useSearchParams()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const initializedFromTemplateRef = useRef(false)

  const [messages, setMessages] = useState<Message[]>(initialChatMessages)
  const [prompt, setPrompt] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<TemplateOption | null>(null)
  const [isGeneratingTemplates, setIsGeneratingTemplates] = useState(false)
  const generateTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.scrollTop = containerRef.current.scrollHeight
  }, [messages, isGeneratingTemplates])

  useEffect(() => {
    return () => {
      if (generateTimeoutRef.current) window.clearTimeout(generateTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (initializedFromTemplateRef.current) return
    const templateId = searchParams.get("template")
    if (!templateId) return
    const template = templateOptions.find((item) => item.id === templateId)
    if (!template) return

    initializedFromTemplateRef.current = true
    setSelectedTemplate(template)
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "bot", text: selectedTemplateNotice(template.name), kind: "suggestions" },
    ])
  }, [searchParams])

  const canSend = prompt.trim().length > 0

  const selectedTemplateData = useMemo(() => {
    if (!selectedTemplate) return null
    return buildEditorData(selectedTemplate.theme, selectedTemplate)
  }, [selectedTemplate])

  const sendPrompt = () => {
    const value = prompt.trim()
    if (!value) return

    setMessages((prev) => [...prev, { id: Date.now(), role: "user", text: value }])
    setIsGeneratingTemplates(true)
    generateTimeoutRef.current = window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "bot",
          text: chatCopy.suggestionsIntro,
          kind: "suggestions",
        },
      ])
      setIsGeneratingTemplates(false)
      generateTimeoutRef.current = null
    }, 900)

    setPrompt("")
  }

  return (
    <WorkspaceShell tab="chat">
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[30px] bg-zinc-950/70 shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
        <div className="scrollbar-hide min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5 md:px-6 md:py-6" ref={containerRef}>
          {messages.map((message) => (
            <div key={message.id} className={cn("flex", message.role === "bot" ? "justify-start" : "justify-end")}>
              <div
                className={cn(
                  "max-w-[96%] rounded-2xl px-3.5 py-3 text-sm",
                  message.role === "bot" ? "bg-zinc-900/80 text-zinc-100" : "bg-sky-500/20 text-sky-100",
                )}
              >
                {message.role === "bot" ? <AnimatedBotText text={message.text} /> : <p className="leading-relaxed">{message.text}</p>}

                {message.kind === "suggestions" ? (
                  <div className="mt-3">
                    <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-2 pr-1">
                      {templateOptions.map((template) => {
                        const selected = selectedTemplate?.id === template.id
                        return (
                          <TemplateSuggestionCard
                            key={template.id}
                            template={template}
                            selected={selected}
                            onPreview={() => setPreviewTemplate(template)}
                            onSelect={() => {
                              setSelectedTemplate(template)
                              setMessages((prev) => [
                                ...prev,
                                { id: Date.now(), role: "bot", text: confirmedTemplateNotice(template.name) },
                              ])
                            }}
                          />
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {isGeneratingTemplates ? <ActivityBubble label="Generating templates" /> : null}

          {selectedTemplate && selectedTemplateData ? (
            <Card className="rounded-2xl border-0 bg-zinc-900/75">
              <CardContent className="space-y-2 p-4">
                <p className="text-sm font-medium text-zinc-100">Selected template: {selectedTemplate.name}</p>
                <p className="text-xs text-zinc-400">Subject: {selectedTemplateData.subjectLine}</p>
                <p className="text-xs text-zinc-400">CTA: {selectedTemplateData.ctaText}</p>
                <TemplatePreview template={selectedTemplate} data={selectedTemplateData} heightClass="h-52" scale={0.33} />
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="bg-zinc-950/75 p-3 md:p-4">
          <div className="flex items-center gap-2 rounded-2xl bg-zinc-900/80 p-2 shadow-inner">
            <Input
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  sendPrompt()
                }
              }}
              placeholder={chatCopy.promptPlaceholder}
              className="h-11 border-zinc-700/70 bg-zinc-900 text-zinc-100"
            />
            <Button
              onClick={sendPrompt}
              disabled={!canSend}
              className="h-11 rounded-xl bg-sky-500 px-5 text-zinc-950 hover:bg-sky-400 disabled:bg-zinc-700 disabled:text-zinc-400"
            >
              Send
            </Button>
          </div>
        </div>
      </div>

      {previewTemplate ? (
        <div className="fixed inset-0 z-50 bg-black/80 p-4 backdrop-blur-sm" onClick={() => setPreviewTemplate(null)}>
          <div className="mx-auto flex h-full max-w-5xl items-center justify-center" onClick={(event) => event.stopPropagation()}>
            <div className="w-full overflow-hidden rounded-3xl bg-zinc-950/95">
              <div className="flex items-center justify-between px-4 py-3">
                <p className="text-sm font-medium text-zinc-100">{previewTemplate.name}</p>
                <Button variant="ghost" size="icon" className="size-9 rounded-full" onClick={() => setPreviewTemplate(null)}>
                  ×
                </Button>
              </div>
              <TemplatePreview template={previewTemplate} data={buildEditorData(previewTemplate.theme, previewTemplate)} heightClass="h-[82vh]" scale={0.9} />
            </div>
          </div>
        </div>
      ) : null}
    </WorkspaceShell>
  )
}
