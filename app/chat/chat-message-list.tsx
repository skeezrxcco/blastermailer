"use client"

import { useEffect, useRef, useState } from "react"

import { formatAssistantText } from "@/app/chat/chat-page.utils"

// ---------------------------------------------------------------------------
// AnimatedBotText
// ---------------------------------------------------------------------------

export function AnimatedBotText({ text }: { text: string }) {
  const formattedText = formatAssistantText(text)
  const [visible, setVisible] = useState("")
  const [isTyping, setIsTyping] = useState(true)
  const animatedRef = useRef(false)

  useEffect(() => {
    if (animatedRef.current) {
      setVisible(formattedText)
      setIsTyping(false)
      return
    }

    animatedRef.current = true
    setVisible("")
    setIsTyping(true)

    let index = 0
    const timer = window.setInterval(() => {
      index += 1
      setVisible(formattedText.slice(0, index))
      if (index >= formattedText.length) {
        window.clearInterval(timer)
        setIsTyping(false)
      }
    }, 10)

    return () => window.clearInterval(timer)
  }, [formattedText])

  return (
    <p className="whitespace-pre-wrap wrap-break-word leading-relaxed">
      {visible}
      {isTyping ? <span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-zinc-300 align-middle" /> : null}
    </p>
  )
}

// ---------------------------------------------------------------------------
// AssistantSignal (typing indicator)
// ---------------------------------------------------------------------------

export function AssistantSignal() {
  return (
    <div className="flex justify-start">
      <div className="inline-flex items-center gap-2 rounded-full bg-zinc-900/70 px-3 py-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-300/35" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-300/85" />
        </span>
        <span className="h-1.5 w-12 animate-pulse rounded-full bg-zinc-700" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CsvSheetSkeleton (loading state for CSV processing)
// ---------------------------------------------------------------------------

export function CsvSheetSkeleton() {
  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[96%] rounded-2xl bg-zinc-900/80 p-3">
        <p className="mb-2 text-xs text-zinc-400">Processing CSV file...</p>
        <div className="animate-pulse space-y-2 rounded-xl bg-zinc-950/70 p-2.5">
          <div className="grid grid-cols-3 gap-2">
            <div className="h-3 rounded bg-zinc-800" />
            <div className="h-3 rounded bg-zinc-800" />
            <div className="h-3 rounded bg-zinc-800" />
          </div>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="grid grid-cols-3 gap-2">
              <div className="h-2.5 rounded bg-zinc-800/90" />
              <div className="h-2.5 rounded bg-zinc-800/90" />
              <div className="h-2.5 rounded bg-zinc-800/90" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
