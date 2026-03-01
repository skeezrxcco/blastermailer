"use client"

import { useState } from "react"
import { AlertCircle, Check, Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { EmailEntry } from "@/app/chat/chat-page.types"
import { computeValidationStats } from "@/app/chat/chat-page.utils"

// ---------------------------------------------------------------------------
// CountTile
// ---------------------------------------------------------------------------

function CountTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-lg border border-zinc-800/70 bg-zinc-900/70">
      <CardContent className="p-2.5">
        <p className="text-[11px] text-zinc-400">{label}</p>
        <p className="text-sm font-semibold text-zinc-100">{value}</p>
      </CardContent>
    </Card>
  )
}

function truncateEmailPreview(value: string, max = 56) {
  const normalized = value.trim()
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, max - 1)}…`
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
  const invalidEntries = entries.filter((entry) => entry.status === "invalid")

  return (
    <div className="mt-3 space-y-3">
      <div className="grid gap-2 md:grid-cols-2">
        <CountTile label="Total recipients" value={String(stats.total)} />
        <CountTile
          label="Ready to send"
          value={`${stats.valid} valid${stats.invalid > 0 || stats.duplicates > 0 ? ` · ${stats.invalid + stats.duplicates} issues` : ""}`}
        />
      </div>

      {invalidEntries.length > 0 ? (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-rose-300">
            <AlertCircle className="h-3.5 w-3.5" />
            {invalidEntries.length} invalid email{invalidEntries.length > 1 ? "s" : ""} found
          </div>
          <div className="mt-2 max-h-24 space-y-1 overflow-y-auto rounded-md bg-zinc-950/50 p-2">
            {invalidEntries.map((entry) => (
              <p key={entry.id} className="truncate text-xs text-rose-200" title={entry.value}>
                {truncateEmailPreview(entry.value)}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-zinc-800/70 bg-zinc-950/65 p-2">
        {entries.map((entry) => {
          const isEditing = editingId === entry.id

          return (
            <div key={entry.id} className="flex items-center gap-2 rounded-md bg-zinc-900/80 px-2 py-1.5">
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
                  className="h-8 w-full rounded-md bg-zinc-950/80 px-2 text-xs text-zinc-100 outline-none focus:ring-2 focus:ring-sky-500/45"
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
                  title={entry.value}
                >
                  {truncateEmailPreview(entry.value)}
                </p>
              )}

              {!isEditing ? (
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
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
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-emerald-300 transition hover:bg-zinc-800"
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
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-800 hover:text-rose-300"
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
          className="rounded-md bg-zinc-100 text-zinc-900 hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          Confirm and Send
        </Button>
      </div>
    </div>
  )
}
