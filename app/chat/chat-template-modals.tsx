"use client"

import { useEffect, useRef, useState } from "react"
import { Sparkles, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { DishKey, EditorChatMessage, EditorThemeState, ImageEditTarget, PreviewMode } from "@/app/chat/chat-page.types"
import type { TemplateEditorData, TemplateOption } from "@/components/shared/newsletter/template-data"
import { ViewportSwitch, DevicePreviewFrame, TemplateCanvas } from "@/app/chat/chat-template-editor"

// ---------------------------------------------------------------------------
// TemplatePreviewModal
// ---------------------------------------------------------------------------

export function TemplatePreviewModal({
  template,
  data,
  theme,
  dishOrder,
  viewport,
  onViewportChange,
  onClose,
}: {
  template: TemplateOption
  data: TemplateEditorData
  theme: EditorThemeState
  dishOrder: DishKey[]
  viewport: PreviewMode
  onViewportChange: (mode: PreviewMode) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="flex h-full flex-col p-2 md:p-4" onClick={(event) => event.stopPropagation()}>
        <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
          <ViewportSwitch mode={viewport} onChange={onViewportChange} />
          <Button size="icon" onClick={onClose} className="size-10 rounded-full bg-zinc-950/80 p-0 text-zinc-100 hover:bg-zinc-900" aria-label="Close preview">
            ×
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2 md:p-4">
          <DevicePreviewFrame mode={viewport}>
            <TemplateCanvas
              template={template}
              data={data}
              theme={theme}
              dishOrder={dishOrder}
              editable={false}
              activeTextField={null}
              onStartTextEdit={() => undefined}
              onStopTextEdit={() => undefined}
              onEditImage={() => undefined}
              onDataChange={() => undefined}
              onThemeChange={() => undefined}
              onSwapDish={() => undefined}
            />
          </DevicePreviewFrame>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TemplateEditorModal
// ---------------------------------------------------------------------------

export function TemplateEditorModal({
  template,
  data,
  onDataChange,
  theme,
  onThemeChange,
  dishOrder,
  onSwapDish,
  viewport,
  onViewportChange,
  onClose,
}: {
  template: TemplateOption
  data: TemplateEditorData
  onDataChange: (field: keyof TemplateEditorData, value: string) => void
  theme: EditorThemeState
  onThemeChange: (patch: Partial<EditorThemeState>) => void
  dishOrder: DishKey[]
  onSwapDish: (source: DishKey, target: DishKey) => void
  viewport: PreviewMode
  onViewportChange: (mode: PreviewMode) => void
  onClose: () => void
}) {
  const chatScrollRef = useRef<HTMLDivElement | null>(null)
  const imageFileInputRef = useRef<HTMLInputElement | null>(null)
  const [chatInput, setChatInput] = useState("")
  const [activeTextField, setActiveTextField] = useState<keyof TemplateEditorData | null>(null)
  const [imageTarget, setImageTarget] = useState<ImageEditTarget | null>(null)
  const [imageUrlInput, setImageUrlInput] = useState("")
  const [aiImagePrompt, setAiImagePrompt] = useState("")
  const [chatMessages, setChatMessages] = useState<EditorChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      text: "Describe a change and I will update the template inline. Example: make the headline shorter and premium.",
    },
  ])

  useEffect(() => {
    if (!chatScrollRef.current) return
    chatScrollRef.current.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" })
  }, [chatMessages])

  const applyPrompt = (prompt: string) => {
    const value = prompt.toLowerCase()
    const updates: Array<[keyof TemplateEditorData, string]> = []
    const themePatch: Partial<EditorThemeState> = {}

    if (value.includes("short") && value.includes("headline")) {
      updates.push(["headline", "New Seasonal Menu Is Live"])
    }
    if (value.includes("premium") || value.includes("luxury") || value.includes("elegant")) {
      updates.push(["subheadline", "A refined seasonal experience crafted for guests who value precision, quality, and chef-led storytelling."])
      themePatch.accentA = "#111827"
      themePatch.accentB = "#9a3412"
    }
    if (value.includes("green") || value.includes("vegan")) {
      themePatch.accentA = "#14532d"
      themePatch.accentB = "#22c55e"
      themePatch.surface = "#f0fdf4"
    }
    if (value.includes("cta")) {
      updates.push(["ctaText", "Book Your Table"])
    }

    updates.forEach(([field, next]) => onDataChange(field, next))
    if (Object.keys(themePatch).length) onThemeChange(themePatch)

    if (!updates.length && !Object.keys(themePatch).length) {
      return "Applied minor copy polish and spacing adjustments."
    }

    return "Updated. Review the preview and continue refining if needed."
  }

  const sendEditorPrompt = () => {
    const prompt = chatInput.trim()
    if (!prompt) return

    const userMessage: EditorChatMessage = { id: Date.now(), role: "user", text: prompt }
    const assistantReply = applyPrompt(prompt)
    const assistantMessage: EditorChatMessage = { id: Date.now() + 1, role: "assistant", text: assistantReply }

    setChatMessages((prev) => [...prev, userMessage, assistantMessage])
    setChatInput("")
  }

  const getImageByTarget = (target: ImageEditTarget) => {
    if (target === "hero") return data.heroImage
    if (target === "dishOne") return theme.dishOneImage
    return theme.dishTwoImage
  }

  const setImageByTarget = (target: ImageEditTarget, value: string) => {
    if (!value.trim()) return
    if (target === "hero") { onDataChange("heroImage", value); return }
    if (target === "dishOne") { onThemeChange({ dishOneImage: value }); return }
    onThemeChange({ dishTwoImage: value })
  }

  const openImageEditor = (target: ImageEditTarget) => {
    setImageTarget(target)
    setImageUrlInput(getImageByTarget(target))
    setAiImagePrompt("")
  }

  const closeImageEditor = () => {
    setImageTarget(null)
    setImageUrlInput("")
    setAiImagePrompt("")
  }

  const applyImageUrl = () => {
    if (!imageTarget) return
    setImageByTarget(imageTarget, imageUrlInput)
    closeImageEditor()
  }

  const generateAiImage = () => {
    if (!imageTarget || !aiImagePrompt.trim()) return
    const generatedUrl = `https://source.unsplash.com/1200x900/?${encodeURIComponent(aiImagePrompt.trim())}`
    setImageByTarget(imageTarget, generatedUrl)
    closeImageEditor()
  }

  const onUploadImageFile = (file: File | null) => {
    if (!file || !imageTarget || !file.type.startsWith("image/")) return
    const url = URL.createObjectURL(file)
    setImageByTarget(imageTarget, url)
    closeImageEditor()
  }

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 text-zinc-100">
      <div className="flex h-full flex-col px-3 pb-3 pt-2 md:px-4 md:pb-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="truncate text-xs uppercase tracking-[0.14em] text-zinc-400">{template.name}</div>
          <div className="flex items-center gap-2">
            <ViewportSwitch mode={viewport} onChange={onViewportChange} />
            <Button size="icon" onClick={onClose} className="size-10 rounded-full bg-zinc-900 p-0 text-zinc-100 hover:bg-zinc-800" aria-label="Close editor">
              ×
            </Button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-h-0 rounded-3xl bg-zinc-900/55 p-2">
            <div className="flex h-full min-h-0 items-start justify-center overflow-hidden rounded-2xl bg-zinc-950/85 p-3">
              <DevicePreviewFrame mode={viewport}>
                <TemplateCanvas
                  template={template}
                  data={data}
                  theme={theme}
                  dishOrder={dishOrder}
                  editable
                  activeTextField={activeTextField}
                  onStartTextEdit={setActiveTextField}
                  onStopTextEdit={() => setActiveTextField(null)}
                  onEditImage={openImageEditor}
                  onDataChange={onDataChange}
                  onThemeChange={onThemeChange}
                  onSwapDish={onSwapDish}
                />
              </DevicePreviewFrame>
            </div>
          </div>

          <div className="flex min-h-0 flex-col rounded-3xl bg-zinc-900/65 p-2.5">
            <div className="mb-2 text-xs text-zinc-300">AI editor chat</div>
            <div ref={chatScrollRef} className="scrollbar-hide min-h-0 flex-1 space-y-2 overflow-y-auto rounded-2xl bg-zinc-950/75 p-2">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[92%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
                    message.role === "assistant" ? "bg-zinc-900 text-zinc-200" : "ml-auto bg-sky-500/20 text-sky-100",
                  )}
                >
                  {message.text}
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-2xl bg-zinc-950/75 p-2">
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    sendEditorPrompt()
                  }
                }}
                placeholder="Tell AI what to change..."
                className="h-10 w-full rounded-xl bg-zinc-900/80 px-3 text-xs text-zinc-100 outline-none focus:ring-2 focus:ring-sky-500/45"
              />
            </div>
          </div>
        </div>
      </div>
      {imageTarget ? (
        <div className="fixed inset-0 z-60 bg-black/70 p-4 backdrop-blur-sm" onClick={closeImageEditor}>
          <div className="mx-auto mt-16 w-full max-w-lg rounded-2xl bg-zinc-950/95 p-4" onClick={(event) => event.stopPropagation()}>
            <p className="text-sm font-medium text-zinc-100">Update image</p>
            <p className="mt-1 text-xs text-zinc-400">Upload a file, paste an image URL, or generate with AI prompt.</p>

            <input
              ref={imageFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => onUploadImageFile(event.target.files?.[0] ?? null)}
            />

            <div className="mt-3 grid gap-2">
              <Button
                type="button"
                onClick={() => imageFileInputRef.current?.click()}
                className="rounded-xl bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload image
              </Button>

              <div className="flex items-center gap-2">
                <input
                  value={imageUrlInput}
                  onChange={(event) => setImageUrlInput(event.target.value)}
                  placeholder="Paste image URL"
                  className="h-10 w-full rounded-xl bg-zinc-900/90 px-3 text-xs text-zinc-100 outline-none focus:ring-2 focus:ring-sky-500/45"
                />
                <Button type="button" onClick={applyImageUrl} className="rounded-xl bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
                  Apply
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  value={aiImagePrompt}
                  onChange={(event) => setAiImagePrompt(event.target.value)}
                  placeholder="Generate with AI prompt (e.g. sushi close-up)"
                  className="h-10 w-full rounded-xl bg-zinc-900/90 px-3 text-xs text-zinc-100 outline-none focus:ring-2 focus:ring-violet-500/45"
                />
                <Button type="button" onClick={generateAiImage} className="rounded-xl bg-violet-500 text-zinc-100 hover:bg-violet-400">
                  <Sparkles className="mr-1 h-4 w-4" />
                  Generate
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
