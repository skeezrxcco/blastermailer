"use client"

import { useState } from "react"
import { Check, Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { EmailEntry } from "@/app/chat/chat-page.types"
import { computeValidationStats } from "@/app/chat/chat-page.utils"

// ---------------------------------------------------------------------------
// ValidationTile
// ---------------------------------------------------------------------------

function ValidationTile({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <Card className="rounded-xl border-0 bg-zinc-900/70">
      <CardContent className="p-2.5">
        <p className="text-[11px] text-zinc-400">{label}</p>
        <p className={cn("text-sm font-semibold", tone)}>{value}</p>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// EmailValidationPanel
// ---------------------------------------------------------------------------

export function EmailValidationPanel({
  entries,
  onEditEntry,
  onRemoveEntry,
  onConfirmSend,
}: {
  entries: EmailEntry[]
  onEditEntry: (id: string, value: string) => void
  onRemoveEntry: (id: string) => void
  onConfirmSend: () => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftValue, setDraftValue] = useState("")

  const stats = computeValidationStats(entries)

  return (
    <div className="mt-3 space-y-3">
      <div className="grid gap-2 md:grid-cols-4">
        <ValidationTile label="Total" value={String(stats.total)} tone="text-zinc-100" />
        <ValidationTile label="Valid" value={String(stats.valid)} tone="text-emerald-300" />
        <ValidationTile label="Invalid" value={String(stats.invalid)} tone="text-rose-300" />
        <ValidationTile label="Duplicates" value={String(stats.duplicates)} tone="text-amber-300" />
      </div>

      <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-xl bg-zinc-950/65 p-2">
        {entries.map((entry) => {
          const isEditing = editingId === entry.id

          return (
            <div key={entry.id} className="flex items-center gap-2 rounded-lg bg-zinc-900/80 px-2 py-1.5">
              {isEditing ? (
                <input
                  value={draftValue}
                  onChange={(event) => setDraftValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      onEditEntry(entry.id, draftValue)
                      setEditingId(null)
                    }
                  }}
                  className="h-8 w-full rounded-lg bg-zinc-950/80 px-2 text-xs text-zinc-100 outline-none focus:ring-2 focus:ring-sky-500/45"
                />
              ) : (
                <p
                  className={cn(
                    "w-full truncate text-xs",
                    entry.status === "valid"
                      ? "text-zinc-200"
                      : entry.status === "duplicate"
                        ? "text-amber-300"
                        : "text-rose-300",
                  )}
                >
                  {entry.value}
                </p>
              )}

              {!isEditing ? (
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
                  onClick={() => {
                    setEditingId(entry.id)
                    setDraftValue(entry.value)
                  }}
                  aria-label="Edit email"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-emerald-300 transition hover:bg-zinc-800"
                  onClick={() => {
                    onEditEntry(entry.id, draftValue)
                    setEditingId(null)
                  }}
                  aria-label="Apply email edit"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              )}

              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-800 hover:text-rose-300"
                onClick={() => onRemoveEntry(entry.id)}
                aria-label="Remove email"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>

      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={onConfirmSend}
          disabled={stats.valid === 0}
          className="rounded-xl bg-zinc-100 text-zinc-900 hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          Confirm and send
        </Button>
      </div>
    </div>
  )
}
