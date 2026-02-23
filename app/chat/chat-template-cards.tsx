"use client"

import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { TemplatePreview } from "@/components/shared/newsletter/template-preview"
import { buildEditorData, type TemplateEditorData, type TemplateOption } from "@/components/shared/newsletter/template-data"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// TemplateSuggestionCard
// ---------------------------------------------------------------------------

export function TemplateSuggestionCard({
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
  const [cardHovered, setCardHovered] = useState(false)
  const previewData = buildEditorData(template.theme, template)

  return (
    <Card
      className="h-[280px] w-[220px] shrink-0 rounded-2xl border-0 bg-zinc-950/55 p-0 sm:w-[240px]"
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
    >
      <CardContent className="flex h-full flex-col p-2.5">
        <div className="mb-1.5 flex items-start justify-between gap-1.5">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-zinc-100">{template.name}</p>
            <p className="truncate text-[10px] text-zinc-400">
              {template.theme} · {template.audience}
            </p>
          </div>
          {selected ? <Badge className="shrink-0 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] text-emerald-200">Selected</Badge> : null}
        </div>

        <TemplatePreview template={template} data={previewData} heightClass="h-32" autoScroll={cardHovered} />

        <p className="mt-1.5 line-clamp-2 text-[10px] leading-relaxed text-zinc-300">{template.description}</p>

        <div className="mt-auto grid grid-cols-2 gap-1.5 pt-1.5">
          <Button
            size="sm"
            className="h-7 rounded-lg bg-zinc-900/80 text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            onClick={onPreview}
          >
            Preview
          </Button>
          <Button
            size="sm"
            onClick={onSelect}
            className={cn(
              "h-7 rounded-lg text-[11px]",
              selected ? "bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30" : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
            )}
          >
            {selected ? "Selected" : "Select"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// SelectedTemplateReviewCard
// ---------------------------------------------------------------------------

export function SelectedTemplateReviewCard({
  template,
  data,
  onEdit,
  onChange,
  onContinue,
}: {
  template: TemplateOption
  data: TemplateEditorData
  onEdit: () => void
  onChange: () => void
  onContinue: () => void
}) {
  const [cardHovered, setCardHovered] = useState(false)

  return (
    <Card
      className="h-[398px] w-[282px] shrink-0 rounded-[24px] border-0 bg-zinc-950/55 p-0 sm:w-[312px]"
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
          <Badge className="rounded-full bg-emerald-500/20 text-emerald-200">Selected</Badge>
        </div>

        <TemplatePreview template={template} data={data} heightClass="h-44" autoScroll={cardHovered} />

        <p className="mt-2 text-xs leading-relaxed text-zinc-300">{template.description}</p>
        <p className="text-[11px] uppercase tracking-wide text-zinc-500">{template.tone}</p>

        <div className="mt-auto grid grid-cols-3 gap-2 pt-2">
          <Button size="sm" className="rounded-xl bg-zinc-900/80 text-zinc-100 hover:bg-zinc-800" onClick={onEdit}>
            Edit
          </Button>
          <Button size="sm" className="rounded-xl bg-zinc-900/80 text-zinc-100 hover:bg-zinc-800" onClick={onChange}>
            Change
          </Button>
          <Button size="sm" className="rounded-xl bg-zinc-100 text-zinc-900 hover:bg-zinc-200" onClick={onContinue}>
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
