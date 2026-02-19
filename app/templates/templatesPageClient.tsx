"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EyeIcon } from "@/components/ui/eye"
import { TemplatePreview } from "@/components/shared/newsletter/template-preview"
import { WorkspaceShell } from "@/components/shared/workspace/app-shell"
import { buildEditorData, templateOptions, type TemplateOption } from "@/components/shared/newsletter/template-data"

export function TemplatesPageClient() {
  const router = useRouter()
  const [preview, setPreview] = useState<TemplateOption | null>(null)

  return (
    <WorkspaceShell tab="templates">
      <div className="scrollbar-hide min-h-0 h-full overflow-y-auto p-4 md:p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-zinc-100">Template library</h2>
          <p className="text-sm text-zinc-400">Choose a professional template and continue editing in chat.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {templateOptions.map((template) => (
            <Card key={template.id} className="h-[390px] rounded-[24px] border-0 bg-zinc-950/55 p-0">
              <CardContent className="flex h-full flex-col p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-zinc-100">{template.name}</p>
                    <p className="text-xs text-zinc-400">
                      {template.theme} · {template.audience}
                    </p>
                  </div>
                  <Badge className="rounded-full bg-zinc-900/70 text-zinc-200">{template.tone}</Badge>
                </div>

                <TemplatePreview template={template} data={buildEditorData(template.theme, template)} heightClass="h-52" autoScroll={false} />

                <p className="mt-3 text-sm text-zinc-300">{template.description}</p>

                <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
                  <Button className="rounded-xl bg-zinc-900/80 text-zinc-100 hover:bg-zinc-800" onClick={() => setPreview(template)}>
                    <EyeIcon size={14} className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    className="rounded-xl bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                    onClick={() => router.push(`/chat?template=${template.id}`)}
                  >
                    Select
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {preview ? (
        <div className="fixed inset-0 z-50 bg-black/80 p-4 backdrop-blur-sm" onClick={() => setPreview(null)}>
          <div className="mx-auto flex h-full max-w-5xl items-center justify-center" onClick={(event) => event.stopPropagation()}>
            <div className="w-full overflow-hidden rounded-3xl bg-zinc-950/95">
              <div className="flex items-center justify-between px-4 py-3">
                <p className="text-sm font-medium text-zinc-100">{preview.name}</p>
                <Button variant="ghost" size="icon" className="size-9 rounded-full" onClick={() => setPreview(null)}>
                  ×
                </Button>
              </div>
              <TemplatePreview template={preview} data={buildEditorData(preview.theme, preview)} heightClass="h-[82vh]" scale={0.9} />
            </div>
          </div>
        </div>
      ) : null}
    </WorkspaceShell>
  )
}
