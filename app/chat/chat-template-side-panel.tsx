"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Expand, Monitor, Smartphone, Tablet, X } from "lucide-react"
import { cn } from "@/lib/utils"

type Viewport = "desktop" | "tablet" | "mobile"

const viewportWidths: Record<Viewport, number> = {
  desktop: 860,
  tablet: 700,
  mobile: 430,
}

export function TemplateSidePanel({
  html,
  subject,
  disablePreviewInteraction = false,
}: {
  html: string
  subject?: string | null
  disablePreviewInteraction?: boolean
}) {
  const [mounted, setMounted] = useState(false)
  const [viewport, setViewport] = useState<Viewport>("desktop")
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
  }, [])

  useEffect(() => {
    if (!isFullscreen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsFullscreen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isFullscreen])

  const renderPreviewFrame = (mode: "split" | "fullscreen") => {
    const isFullscreenMode = mode === "fullscreen"
    const iframeWidth = viewportWidths[viewport]

    return (
      <iframe
        srcDoc={html}
        title={subject ? `${subject} preview` : "Template preview"}
        className={cn(
          "border-0 bg-transparent",
          disablePreviewInteraction && !isFullscreenMode ? "pointer-events-none" : "",
          isFullscreenMode ? "h-[calc(100vh-110px)] max-w-full" : "h-full w-full",
        )}
        style={{
          width: isFullscreenMode ? iframeWidth : "100%",
          maxWidth: "100%",
        }}
        sandbox="allow-same-origin"
      />
    )
  }

  const fullscreenOverlay = (
    <div className="fixed inset-0 z-[200] bg-zinc-950">
      <div className="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-md border border-zinc-700/70 bg-zinc-900/95 p-1.5">
        {([
          { id: "desktop" as Viewport, icon: Monitor },
          { id: "tablet" as Viewport, icon: Tablet },
          { id: "mobile" as Viewport, icon: Smartphone },
        ]).map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setViewport(id)}
            className={cn(
              "rounded-md p-1.5 transition",
              viewport === id
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
            )}
            aria-label={`${id} preview`}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
        <button
          type="button"
          onClick={() => setIsFullscreen(false)}
          className="ml-1 rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
          aria-label="Close fullscreen preview"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="scrollbar-hide flex h-full w-full items-start justify-center overflow-y-auto overflow-x-hidden px-3 pb-6 pt-12 md:px-6 md:pt-14">
        {renderPreviewFrame("fullscreen")}
      </div>
    </div>
  )

  return (
    <div
      className={cn(
        "relative flex h-full w-full min-w-0 flex-col border-l border-zinc-800/60 bg-zinc-950/95 backdrop-blur-sm transition-all duration-300 ease-out",
        mounted ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0",
      )}
    >
      <div className="relative min-h-0 flex-1 bg-zinc-200">
        <div className="flex h-full items-stretch justify-center">
          {renderPreviewFrame("split")}
        </div>
        <div className="pointer-events-none absolute inset-0">
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="pointer-events-auto absolute right-3 top-3 rounded-md border border-zinc-700/70 bg-zinc-900/90 p-1.5 text-zinc-300 transition hover:bg-zinc-800 hover:text-zinc-100"
            aria-label="Open fullscreen preview"
          >
            <Expand className="h-4 w-4" />
          </button>
        </div>
      </div>

      {mounted && isFullscreen ? createPortal(fullscreenOverlay, document.body) : null}
    </div>
  )
}
