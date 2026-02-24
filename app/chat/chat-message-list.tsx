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
    <div className="flex items-center gap-1.5 py-1">
      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500" style={{ animationDelay: "0ms" }} />
      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500" style={{ animationDelay: "150ms" }} />
      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500" style={{ animationDelay: "300ms" }} />
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
