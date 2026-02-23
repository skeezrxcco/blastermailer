"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { chatCopy } from "@/app/chat/chat-page.data"
import { AiModeSelector } from "@/app/chat/chat-mode-selector"

// ---------------------------------------------------------------------------
// ChatComposerBar
// ---------------------------------------------------------------------------

export function ChatComposerBar({
  prompt,
  onPromptChange,
  onSend,
  composerMode,
  isOutOfCredits,
  isPaidPlan,
  canUploadCsv,
  csvFileInputRef,
  onCsvFileChange,
  selectedModelChoice,
  selectedSpecificModel,
  onModelChoiceChange,
  onSpecificModelChange,
  showHero,
}: {
  prompt: string
  onPromptChange: (value: string) => void
  onSend: () => void
  composerMode: "prompt" | "emails"
  isOutOfCredits: boolean
  isPaidPlan: boolean
  canUploadCsv: boolean
  csvFileInputRef: React.RefObject<HTMLInputElement | null>
  onCsvFileChange: (file: File | null) => void
  selectedModelChoice: string
  selectedSpecificModel: string | null
  onModelChoiceChange: (id: string) => void
  onSpecificModelChange: (id: string | null) => void
  showHero: boolean
}) {
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [isComposerStacked, setIsComposerStacked] = useState(false)

  const resizeTextarea = () => {
    const element = textareaRef.current
    if (!element) return
    const minHeight = 28
    const maxHeight = 132
    element.style.height = "0px"
    const nextHeight = Math.min(element.scrollHeight, maxHeight)
    element.style.height = `${Math.max(nextHeight, minHeight)}px`
    element.style.overflowY = element.scrollHeight > maxHeight ? "auto" : "hidden"
    setIsComposerStacked(element.value.includes("\n") || nextHeight > 44)
  }

  const handlePromptChange = (value: string) => {
    onPromptChange(value)
    requestAnimationFrame(() => resizeTextarea())
  }

  useEffect(() => {
    resizeTextarea()
  }, [prompt])

  const renderUploadButton = (disabled: boolean) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => csvFileInputRef.current?.click()}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg leading-none transition",
        !disabled ? "bg-zinc-950 text-zinc-100 hover:bg-zinc-900" : "cursor-not-allowed bg-zinc-950/55 text-zinc-600",
      )}
      aria-label="Upload CSV recipients"
    >
      +
    </button>
  )

  const renderModeSelector = () => (
    <AiModeSelector
      selectedModelChoice={selectedModelChoice}
      selectedSpecificModel={selectedSpecificModel}
      isPaidPlan={isPaidPlan}
      isOutOfCredits={isOutOfCredits}
      onModelChoiceChange={onModelChoiceChange}
      onSpecificModelChange={onSpecificModelChange}
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
        "rounded-[30px] bg-zinc-900/55 px-4 py-3 shadow-[0_18px_44px_-24px_rgba(0,0,0,0.9)] ring-1 ring-zinc-700/60 backdrop-blur-xl",
        showHero ? "w-full max-w-4xl" : "",
      )}
    >
      <input
        ref={csvFileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => onCsvFileChange(event.target.files?.[0] ?? null)}
      />
      <div className={cn("flex gap-3 transition-all duration-300 ease-out", isComposerStacked ? "items-start" : "items-center")}>
        {!isComposerStacked ? renderUploadButton(!canUploadCsv) : null}
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
              ? "Monthly quota used up. Resets next month."
              : composerMode === "emails"
                ? chatCopy.emailInputPlaceholder
                : chatCopy.promptPlaceholder
          }
          rows={1}
          disabled={isOutOfCredits}
          className="scrollbar-hide min-h-[28px] max-h-[132px] w-full resize-none bg-transparent py-2.5 text-sm leading-6 text-zinc-100 placeholder:text-zinc-500 focus:outline-none disabled:text-zinc-500 md:text-[15px]"
        />
        {!isComposerStacked ? renderModeSelector() : null}
        {!isComposerStacked ? renderUpgradeCta() : null}
      </div>
      {isComposerStacked ? (
        <div className="mt-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {renderUploadButton(!canUploadCsv)}
              {renderModeSelector()}
            </div>
            {renderUpgradeCta()}
          </div>
        </div>
      ) : null}
      {isOutOfCredits ? (
        <div className="mt-2 flex items-center justify-between rounded-xl bg-zinc-950/70 px-3 py-2 text-xs">
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
