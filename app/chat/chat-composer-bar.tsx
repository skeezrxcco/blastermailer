"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { FileSpreadsheet, FileText, ImageIcon, Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { chatCopy } from "@/app/chat/chat-page.data"
import { AiModeSelector } from "@/app/chat/chat-mode-selector"
import type { ChatAttachment } from "@/app/chat/chat-page.types"
import type { AvailableMode } from "@/hooks/use-ai-models"

// ---------------------------------------------------------------------------
// ChatComposerBar
// ---------------------------------------------------------------------------

export type UploadFileType = "csv" | "document" | "image"

export function ChatComposerBar({
  prompt,
  onPromptChange,
  onSend,
  composerMode,
  isOutOfCredits,
  isPaidPlan,
  canUpload,
  onCsvFile,
  onDocumentFile,
  onImageFiles,
  selectedModelChoice,
  onModelChoiceChange,
  showHero,
  pendingAttachments,
  onRemoveAttachment,
  availableModes,
}: {
  prompt: string
  onPromptChange: (value: string) => void
  onSend: () => void
  composerMode: "prompt" | "emails"
  isOutOfCredits: boolean
  isPaidPlan: boolean
  canUpload: boolean
  onCsvFile: (file: File) => void
  onDocumentFile: (file: File) => void
  onImageFiles: (files: File[]) => void
  selectedModelChoice: string
  onModelChoiceChange: (id: string) => void
  showHero: boolean
  pendingAttachments?: ChatAttachment[]
  onRemoveAttachment?: (id: string) => void
  availableModes: AvailableMode[]
}) {
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const csvInputRef = useRef<HTMLInputElement | null>(null)
  const docInputRef = useRef<HTMLInputElement | null>(null)
  const imgInputRef = useRef<HTMLInputElement | null>(null)
  const [isComposerStacked, setIsComposerStacked] = useState(false)

  const resizeTextarea = () => {
    const element = textareaRef.current
    if (!element) return
    const minHeight = 22
    const maxHeight = 100
    element.style.height = "0px"
    const nextHeight = Math.min(element.scrollHeight, maxHeight)
    element.style.height = `${Math.max(nextHeight, minHeight)}px`
    element.style.overflowY = element.scrollHeight > maxHeight ? "auto" : "hidden"
    setIsComposerStacked(element.value.includes("\n") || nextHeight > 40)
  }

  const handlePromptChange = (value: string) => {
    onPromptChange(value)
    requestAnimationFrame(() => resizeTextarea())
  }

  useEffect(() => {
    resizeTextarea()
  }, [prompt])

  const renderUploadButton = (disabled: boolean) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition",
            !disabled ? "bg-zinc-950 text-zinc-100 hover:bg-zinc-900" : "cursor-not-allowed bg-zinc-950/55 text-zinc-600",
          )}
          aria-label="Upload file"
        >
          <Plus className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" sideOffset={8} className="w-44 border-zinc-800 bg-zinc-950 p-1">
        <DropdownMenuItem className="gap-2 rounded-md text-xs text-zinc-300 focus:bg-zinc-800/60 focus:text-zinc-100" onClick={() => csvInputRef.current?.click()}>
          <FileSpreadsheet className="h-3.5 w-3.5 text-zinc-500" />
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 rounded-md text-xs text-zinc-300 focus:bg-zinc-800/60 focus:text-zinc-100" onClick={() => docInputRef.current?.click()}>
          <FileText className="h-3.5 w-3.5 text-zinc-500" />
          Documents
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 rounded-md text-xs text-zinc-300 focus:bg-zinc-800/60 focus:text-zinc-100" onClick={() => imgInputRef.current?.click()}>
          <ImageIcon className="h-3.5 w-3.5 text-zinc-500" />
          Images / Photos
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const renderModeSelector = () => (
    <AiModeSelector
      selectedModelChoice={selectedModelChoice}
      isOutOfCredits={isOutOfCredits}
      onModelChoiceChange={onModelChoiceChange}
      availableModes={availableModes}
    />
  )

  const renderUpgradeCta = () => {
    if (isPaidPlan) return null
    return (
      <Button
        type="button"
        onClick={() => router.push("/pricing")}
        className="h-9 shrink-0 rounded-full bg-zinc-100 px-4 text-xs font-semibold text-zinc-900 hover:bg-zinc-200"
      >
        {isOutOfCredits ? "Upgrade" : "Unlock Pro"}
      </Button>
    )
  }

  return (
    <div
      className={cn(
        "rounded-2xl bg-zinc-900/55 px-3 py-2 shadow-lg ring-1 ring-zinc-700/40 backdrop-blur-xl",
        showHero ? "w-full max-w-4xl" : "",
      )}
    >
      <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onCsvFile(f); e.target.value = "" }} />
      <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.md,.rtf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onDocumentFile(f); e.target.value = "" }} />
      <input ref={imgInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { const files = e.target.files; if (files?.length) onImageFiles(Array.from(files)); e.target.value = "" }} />
      {pendingAttachments && pendingAttachments.length > 0 ? (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {pendingAttachments.map((att) => (
            <div key={att.id} className="group relative">
              {att.type === "image" && att.previewUrl ? (
                <img src={att.previewUrl} alt={att.name} className="h-12 w-12 rounded-lg object-cover ring-1 ring-zinc-700/50" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-800/60 ring-1 ring-zinc-700/50">
                  {att.type === "csv" ? <FileSpreadsheet className="h-4 w-4 text-zinc-400" /> : <FileText className="h-4 w-4 text-zinc-400" />}
                </div>
              )}
              {onRemoveAttachment ? (
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(att.id)}
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 opacity-0 ring-1 ring-zinc-600 transition hover:bg-zinc-700 hover:text-zinc-200 group-hover:opacity-100"
                  aria-label={`Remove ${att.name}`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              ) : null}
              <span className="absolute bottom-0 left-0 right-0 truncate rounded-b-lg bg-zinc-950/80 px-0.5 text-center text-[8px] leading-tight text-zinc-400">{att.name.length > 8 ? att.name.slice(0, 6) + "…" : att.name}</span>
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        {!isComposerStacked ? renderUploadButton(!canUpload) : null}
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(event) => handlePromptChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              onSend()
            }
          }}
          placeholder={
            isOutOfCredits
              ? "Monthly quota used up."
              : composerMode === "emails"
                ? chatCopy.emailInputPlaceholder
                : chatCopy.promptPlaceholder
          }
          rows={1}
          disabled={isOutOfCredits}
          className="scrollbar-hide min-h-[22px] max-h-[100px] w-full resize-none bg-transparent py-1.5 text-sm leading-5 text-zinc-100 placeholder:text-zinc-500 focus:outline-none disabled:text-zinc-500"
        />
        {!isComposerStacked ? (
          <>
            {renderModeSelector()}
            {renderUpgradeCta()}
          </>
        ) : null}
      </div>
      {/* Stacked row: upload left, model+upgrade right — animated */}
      <div
        className={cn(
          "grid transition-all duration-200 ease-out",
          isComposerStacked ? "mt-1.5 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="flex items-center justify-between">
            {renderUploadButton(!canUpload)}
            <div className="flex items-center gap-2">
              {renderModeSelector()}
              {renderUpgradeCta()}
            </div>
          </div>
        </div>
      </div>
      {isOutOfCredits ? (
        <div className="mt-1.5 flex items-center justify-between rounded-lg bg-zinc-950/70 px-2.5 py-1.5 text-xs">
          <span className="text-zinc-400">Monthly quota used up.</span>
          {!isPaidPlan ? (
            <button
              type="button"
              onClick={() => router.push("/pricing")}
              className="font-medium text-cyan-300 transition hover:text-cyan-200"
            >
              Upgrade Plan
            </button>
          ) : (
            <span className="text-zinc-500">Resets next month</span>
          )}
        </div>
      ) : null}
    </div>
  )
}
