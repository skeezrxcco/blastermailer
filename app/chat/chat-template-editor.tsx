"use client"

import { type DragEvent, type ReactNode } from "react"
import { Monitor, Pencil, Smartphone, TabletSmartphone } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { DishKey, EditorThemeState, ImageEditTarget, PreviewMode } from "@/app/chat/chat-page.types"
import { viewportSpecs } from "@/app/chat/chat-page.types"
import type { TemplateEditorData, TemplateOption } from "@/components/shared/newsletter/template-data"

// ---------------------------------------------------------------------------
// ViewportSwitch
// ---------------------------------------------------------------------------

export function ViewportSwitch({ mode, onChange }: { mode: PreviewMode; onChange: (mode: PreviewMode) => void }) {
  const options: Array<{ id: PreviewMode; icon: ReactNode }> = [
    { id: "desktop", icon: <Monitor className="h-4 w-4" /> },
    { id: "tablet", icon: <TabletSmartphone className="h-4 w-4" /> },
    { id: "mobile", icon: <Smartphone className="h-4 w-4" /> },
  ]

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-zinc-950/80 p-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-full transition",
            mode === option.id ? "bg-zinc-100 text-zinc-900" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
          )}
          aria-label={viewportSpecs[option.id].label}
        >
          {option.icon}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// DevicePreviewFrame
// ---------------------------------------------------------------------------

export function DevicePreviewFrame({ mode, children }: { mode: PreviewMode; children: ReactNode }) {
  const spec = viewportSpecs[mode]
  const widthCap = mode === "desktop" ? 980 : mode === "tablet" ? 720 : 390
  const ratio = spec.width / spec.height
  const displayWidth = Math.min(spec.width, widthCap)
  const displayHeight = Math.round(displayWidth / ratio)

  return (
    <div className="rounded-[28px] bg-zinc-900/50 p-2 shadow-2xl">
      <div
        className="scrollbar-hide overflow-y-auto overflow-x-hidden rounded-[18px] bg-zinc-950/45"
        style={{
          width: `min(${displayWidth}px, calc(100vw - 48px))`,
          height: `min(${displayHeight}px, calc(100vh - 170px))`,
        }}
      >
        {children}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// EditableCopy
// ---------------------------------------------------------------------------

export function EditableCopy({
  fieldId,
  value,
  editable,
  activeTextField,
  onStartEdit,
  onStopEdit,
  onChange,
  className,
  multiline = false,
  tag = "p",
  showEditIcon = true,
}: {
  fieldId: keyof TemplateEditorData
  value: string
  editable: boolean
  activeTextField: keyof TemplateEditorData | null
  onStartEdit: (field: keyof TemplateEditorData) => void
  onStopEdit: () => void
  onChange: (value: string) => void
  className?: string
  multiline?: boolean
  tag?: "p" | "h2" | "h3" | "span"
  showEditIcon?: boolean
}) {
  const Tag = tag
  const isEditing = editable && activeTextField === fieldId
  const Wrapper = tag === "span" ? "span" : "div"

  if (!editable) {
    return <Tag className={className}>{value}</Tag>
  }

  return (
    <Wrapper className={cn("group relative", tag === "span" ? "inline-flex items-center gap-1" : "")}>
      <Tag
        className={cn(
          className,
          "-mx-1 rounded px-1 outline-none",
          isEditing ? "ring-2 ring-sky-500/45" : "",
          multiline ? "whitespace-pre-line" : "whitespace-normal",
        )}
        contentEditable={isEditing}
        suppressContentEditableWarning
        spellCheck={false}
        onBlur={(event) => {
          const next = (multiline ? event.currentTarget.innerText : event.currentTarget.textContent)?.trim() ?? ""
          if (!next) {
            event.currentTarget.textContent = value
            onStopEdit()
            return
          }
          if (next !== value) onChange(next)
          onStopEdit()
        }}
        onKeyDown={(event) => {
          if (!multiline && event.key === "Enter") {
            event.preventDefault()
            event.currentTarget.blur()
          }
        }}
      >
        {value}
      </Tag>
      {showEditIcon ? (
        <button
          type="button"
          className={cn(
            "inline-flex h-5 w-5 items-center justify-center rounded-full text-zinc-500 transition hover:bg-black/10 hover:text-zinc-900",
            tag === "span" ? "" : "absolute -right-1 -top-1",
          )}
          onClick={() => onStartEdit(fieldId)}
          aria-label="Edit text"
        >
          <Pencil className="h-3 w-3" />
        </button>
      ) : null}
    </Wrapper>
  )
}

// ---------------------------------------------------------------------------
// TemplateCanvas
// ---------------------------------------------------------------------------

export function TemplateCanvas({
  template,
  data,
  theme,
  dishOrder,
  editable,
  activeTextField,
  onStartTextEdit,
  onStopTextEdit,
  onEditImage,
  onDataChange,
  onThemeChange,
  onSwapDish,
}: {
  template: TemplateOption
  data: TemplateEditorData
  theme: EditorThemeState
  dishOrder: DishKey[]
  editable: boolean
  activeTextField: keyof TemplateEditorData | null
  onStartTextEdit: (field: keyof TemplateEditorData) => void
  onStopTextEdit: () => void
  onEditImage: (target: ImageEditTarget) => void
  onDataChange: (field: keyof TemplateEditorData, value: string) => void
  onThemeChange: (patch: Partial<EditorThemeState>) => void
  onSwapDish: (source: DishKey, target: DishKey) => void
}) {
  const commit = (field: keyof TemplateEditorData, value: string) => {
    const next = value.trim()
    if (!next) return
    onDataChange(field, next)
  }

  const updateImageFromFile = (file: File, target: "hero" | "dishOne" | "dishTwo") => {
    if (!file.type.startsWith("image/")) return
    const url = URL.createObjectURL(file)
    if (target === "hero") {
      onDataChange("heroImage", url)
      return
    }
    if (target === "dishOne") {
      onThemeChange({ dishOneImage: url })
      return
    }
    onThemeChange({ dishTwoImage: url })
  }

  const handleDrop = (event: DragEvent<HTMLElement>, target: "hero" | "dishOne" | "dishTwo") => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (!file) return
    updateImageFromFile(file, target)
  }

  const dishDataMap = {
    one: {
      title: data.dishOneTitle,
      description: data.dishOneDescription,
      image: theme.dishOneImage,
      titleField: "dishOneTitle" as const,
      descriptionField: "dishOneDescription" as const,
    },
    two: {
      title: data.dishTwoTitle,
      description: data.dishTwoDescription,
      image: theme.dishTwoImage,
      titleField: "dishTwoTitle" as const,
      descriptionField: "dishTwoDescription" as const,
    },
  }

  return (
    <div className="min-h-full w-full bg-transparent px-1 py-4 sm:px-2">
      <article className="mx-auto w-full max-w-[640px] overflow-hidden rounded-[26px] bg-zinc-50 shadow-[0_18px_45px_rgba(0,0,0,0.24)]">
        <div
          className="relative h-[290px]"
          onDragOver={(event) => editable && event.preventDefault()}
          onDrop={(event) => editable && handleDrop(event, "hero")}
        >
          <img src={data.heroImage} alt={data.headline} className="h-full w-full object-cover" />
          {editable ? (
            <button
              type="button"
              onClick={() => onEditImage("hero")}
              className="absolute right-3 top-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm"
              aria-label="Edit hero image"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(125deg, ${theme.accentA}dd 0%, ${theme.accentB}88 52%, #0000006f 100%)`,
            }}
          />

          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <EditableCopy fieldId="preheader" value={data.preheader} editable={editable} activeTextField={activeTextField} onStartEdit={onStartTextEdit} onStopEdit={onStopTextEdit} onChange={(v) => commit("preheader", v)} className="text-xs uppercase tracking-[0.14em] text-white/85" />
            <EditableCopy fieldId="headline" tag="h2" value={data.headline} editable={editable} activeTextField={activeTextField} onStartEdit={onStartTextEdit} onStopEdit={onStopTextEdit} onChange={(v) => commit("headline", v)} className="mt-2 text-3xl font-semibold leading-tight" />
            <EditableCopy fieldId="subheadline" value={data.subheadline} editable={editable} activeTextField={activeTextField} onStartEdit={onStartTextEdit} onStopEdit={onStopTextEdit} multiline onChange={(v) => commit("subheadline", v)} className="mt-2 max-w-[560px] text-sm leading-relaxed text-white/90" />
          </div>
        </div>

        <div className="space-y-6 px-5 py-6" style={{ backgroundColor: theme.surface }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <EditableCopy fieldId="restaurantName" tag="p" value={data.restaurantName} editable={editable} activeTextField={activeTextField} onStartEdit={onStartTextEdit} onStopEdit={onStopTextEdit} onChange={(v) => commit("restaurantName", v)} className="text-xl font-semibold text-zinc-900" />
              <EditableCopy fieldId="subjectLine" value={data.subjectLine} editable={editable} activeTextField={activeTextField} onStartEdit={onStartTextEdit} onStopEdit={onStopTextEdit} onChange={(v) => commit("subjectLine", v)} className="text-sm text-zinc-600" />
            </div>
            <Badge className="rounded-full bg-white/80 px-3 py-1 text-[11px] uppercase tracking-wide text-zinc-700">{template.theme}</Badge>
          </div>

          <div className="rounded-2xl bg-white/75 p-4">
            <EditableCopy fieldId="offerTitle" tag="h3" value={data.offerTitle} editable={editable} activeTextField={activeTextField} onStartEdit={onStartTextEdit} onStopEdit={onStopTextEdit} onChange={(v) => commit("offerTitle", v)} className="text-lg font-semibold text-zinc-900" />
            <EditableCopy fieldId="offerDescription" value={data.offerDescription} editable={editable} activeTextField={activeTextField} onStartEdit={onStartTextEdit} onStopEdit={onStopTextEdit} multiline onChange={(v) => commit("offerDescription", v)} className="mt-2 text-sm leading-relaxed text-zinc-600" />
            <button type="button" className="mt-4 inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold" style={{ backgroundColor: theme.ctaBg, color: theme.ctaText }}>
              <EditableCopy fieldId="ctaText" tag="span" value={data.ctaText} editable={editable} activeTextField={activeTextField} onStartEdit={onStartTextEdit} onStopEdit={onStopTextEdit} onChange={(v) => commit("ctaText", v)} className="text-sm" showEditIcon={false} />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {dishOrder.map((dishKey) => {
              const dish = dishDataMap[dishKey]
              const target = dishKey === "one" ? "dishOne" : "dishTwo"
              return (
                <div
                  key={dishKey}
                  className="relative overflow-hidden rounded-2xl bg-white"
                  draggable={editable}
                  onDragStart={(event) => { event.dataTransfer.setData("text/plain", dishKey) }}
                  onDragOver={(event) => editable && event.preventDefault()}
                  onDrop={(event) => {
                    if (!editable) return
                    event.preventDefault()
                    const source = event.dataTransfer.getData("text/plain") as DishKey
                    if (source && source !== dishKey) {
                      onSwapDish(source, dishKey)
                      return
                    }
                    const file = event.dataTransfer.files?.[0]
                    if (file) handleDrop(event, target)
                  }}
                >
                  {editable ? (
                    <button type="button" onClick={() => onEditImage(target)} className="absolute right-2 top-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm" aria-label="Edit dish image">
                      <Pencil className="h-3 w-3" />
                    </button>
                  ) : null}
                  <img src={dish.image} alt={dish.title} className="h-32 w-full object-cover" />
                  <div className="space-y-1 p-3">
                    <EditableCopy fieldId={dish.titleField} tag="p" value={dish.title} editable={editable} activeTextField={activeTextField} onStartEdit={onStartTextEdit} onStopEdit={onStopTextEdit} onChange={(v) => commit(dish.titleField, v)} className="text-sm font-semibold text-zinc-900" />
                    <EditableCopy fieldId={dish.descriptionField} value={dish.description} editable={editable} activeTextField={activeTextField} onStartEdit={onStartTextEdit} onStopEdit={onStopTextEdit} multiline onChange={(v) => commit(dish.descriptionField, v)} className="text-xs leading-relaxed text-zinc-600" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <footer className="bg-white px-5 py-4">
          <EditableCopy fieldId="footerNote" value={data.footerNote} editable={editable} activeTextField={activeTextField} onStartEdit={onStartTextEdit} onStopEdit={onStopTextEdit} multiline onChange={(v) => commit("footerNote", v)} className="text-xs leading-relaxed text-zinc-500" />
        </footer>
      </article>
    </div>
  )
}
