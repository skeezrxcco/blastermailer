"use client"

import { useEffect, useRef, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { TemplateEditorData, TemplateOption } from "@/components/shared/newsletter/template-data"

export function TemplatePreview({
  template,
  data,
  heightClass = "h-56",
  scale = 0.28,
  autoScroll = false,
}: {
  template: TemplateOption
  data: TemplateEditorData
  heightClass?: string
  scale?: number
  autoScroll?: boolean
}) {
  const baseWidth = 640
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const scaledCanvasRef = useRef<HTMLDivElement | null>(null)
  const [scrollOffset, setScrollOffset] = useState(0)

  useEffect(() => {
    const updateOffset = () => {
      if (!viewportRef.current || !scaledCanvasRef.current) return
      const viewportHeight = viewportRef.current.getBoundingClientRect().height
      const canvasHeight = scaledCanvasRef.current.getBoundingClientRect().height
      const maxOffset = Math.max(0, canvasHeight - viewportHeight)
      setScrollOffset(autoScroll ? maxOffset * 0.88 : 0)
    }

    updateOffset()

    if (typeof ResizeObserver !== "undefined" && viewportRef.current && scaledCanvasRef.current) {
      const observer = new ResizeObserver(updateOffset)
      observer.observe(viewportRef.current)
      observer.observe(scaledCanvasRef.current)
      return () => observer.disconnect()
    }
  }, [autoScroll, scale, template.id, data.headline, data.subheadline, data.heroImage, data.offerDescription])

  return (
    <div ref={viewportRef} className={cn("flex items-start justify-center overflow-hidden rounded-[24px] bg-transparent", heightClass)}>
      <div style={{ width: baseWidth * scale }}>
        <div
          style={{
            transform: `translateY(-${scrollOffset}px)`,
            transition: autoScroll
              ? "transform 2.2s cubic-bezier(0.18, 0.72, 0.22, 1)"
              : "transform 0.7s cubic-bezier(0.33, 1, 0.68, 1)",
          }}
        >
          <div ref={scaledCanvasRef} style={{ width: baseWidth, transform: `scale(${scale})`, transformOrigin: "top left" }}>
            <TemplateCanvas template={template} data={data} />
          </div>
        </div>
      </div>
    </div>
  )
}

function TemplateCanvas({
  template,
  data,
}: {
  template: TemplateOption
  data: TemplateEditorData
}) {
  return (
    <div className="min-h-full w-full bg-transparent px-1 py-4 sm:px-2">
      <article className="mx-auto w-full max-w-[640px] overflow-hidden rounded-[26px] bg-zinc-50 shadow-[0_18px_45px_rgba(0,0,0,0.24)]">
        <div className="relative h-[290px]">
          <img src={data.heroImage} alt={data.headline} className="h-full w-full object-cover" />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(125deg, ${template.accentA}dd 0%, ${template.accentB}88 52%, #0000006f 100%)`,
            }}
          />

          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <p className="text-xs uppercase tracking-[0.14em] text-white/85">{data.preheader}</p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight">{data.headline}</h2>
            <p className="mt-2 max-w-[560px] text-sm leading-relaxed text-white/90">{data.subheadline}</p>
          </div>
        </div>

        <div className="space-y-6 px-5 py-6" style={{ backgroundColor: template.surface }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xl font-semibold text-zinc-900">{data.restaurantName}</p>
              <p className="text-sm text-zinc-600">{data.subjectLine}</p>
            </div>
            <Badge className="rounded-full bg-white/80 px-3 py-1 text-[11px] uppercase tracking-wide text-zinc-700">{template.theme}</Badge>
          </div>

          <div className="rounded-2xl bg-white/75 p-4">
            <h3 className="text-lg font-semibold text-zinc-900">{data.offerTitle}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{data.offerDescription}</p>
            <button
              type="button"
              className="mt-4 inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold"
              style={{ backgroundColor: template.ctaBg, color: template.ctaText }}
            >
              {data.ctaText}
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="overflow-hidden rounded-2xl bg-white">
              <img src={template.dishOneImage} alt={data.dishOneTitle} className="h-32 w-full object-cover" />
              <div className="space-y-1 p-3">
                <p className="text-sm font-semibold text-zinc-900">{data.dishOneTitle}</p>
                <p className="text-xs leading-relaxed text-zinc-600">{data.dishOneDescription}</p>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl bg-white">
              <img src={template.dishTwoImage} alt={data.dishTwoTitle} className="h-32 w-full object-cover" />
              <div className="space-y-1 p-3">
                <p className="text-sm font-semibold text-zinc-900">{data.dishTwoTitle}</p>
                <p className="text-xs leading-relaxed text-zinc-600">{data.dishTwoDescription}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Guest experience</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700">
              Expect polished service, chef-led storytelling, and precise pacing from first course to dessert. This template is built to
              convert with premium copy hierarchy and clear booking actions.
            </p>
          </div>
        </div>

        <footer className="bg-white px-5 py-4">
          <p className="text-xs leading-relaxed text-zinc-500">{data.footerNote}</p>
        </footer>
      </article>
    </div>
  )
}
