"use client"

import { useState } from "react"

import { chatCopy } from "@/app/chat/chat-page.data"
import { computeValidationStats, normalizeEmailEntries, parseEmailEntries, parseEmailEntriesFromCsvText } from "@/app/chat/chat-page.utils"
import type { EmailEntry, Message } from "@/app/chat/chat-page.types"

export function useChatEmail(
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  composerMode: "prompt" | "emails",
  setComposerMode: (mode: "prompt" | "emails") => void,
) {
  const [emailEntries, setEmailEntries] = useState<EmailEntry[]>([])
  const [isCsvProcessing, setIsCsvProcessing] = useState(false)

  const appendEmailEntries = (incoming: EmailEntry[], prefix: string) => {
    let mergedEntries: EmailEntry[] = []
    setEmailEntries((prev) => {
      mergedEntries = normalizeEmailEntries([...prev, ...incoming])
      return mergedEntries
    })
    const stats = computeValidationStats(mergedEntries)
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", text: `${prefix} (total ${mergedEntries.length})` },
      {
        id: crypto.randomUUID(),
        role: "bot",
        text: `Upload recap: ${stats.total} total · ${stats.valid} valid · ${stats.invalid} invalid · ${stats.duplicates} duplicates.`,
        kind: "validation",
        validationStats: stats,
      },
    ])
  }

  const processCsvFile = async (file: File | null, csvFileInputRef: React.RefObject<HTMLInputElement | null>) => {
    if (!file) return
    setIsCsvProcessing(true)
    try {
      const csvText = await file.text()
      await new Promise((resolve) => window.setTimeout(resolve, 650))
      const parsed = parseEmailEntriesFromCsvText(csvText)
      if (!parsed.ok) {
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "bot", text: `CSV error: ${parsed.error}` }])
        return
      }
      const fileLabel = file.name.length > 36 ? `${file.name.slice(0, 35)}…` : file.name
      appendEmailEntries(parsed.entries, `CSV ${fileLabel} imported ${parsed.entries.length} recipients`)
    } catch {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "bot", text: "Could not read CSV file. Please upload a valid .csv file." }])
    } finally {
      setIsCsvProcessing(false)
      if (csvFileInputRef.current) csvFileInputRef.current.value = ""
    }
  }

  const handleEmailTextInput = (
    value: string,
    setPrompt: (v: string) => void,
  ) => {
    const parsed = parseEmailEntries(value)
    if (!parsed.length) {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "bot", text: "No email addresses detected. Paste plain emails or a CSV containing an email column." }])
      setPrompt("")
      return true
    }
    appendEmailEntries(parsed, `Added ${parsed.length} recipients`)
    setPrompt("")
    return true
  }

  const updateEmailEntry = (id: string, nextValue: string) => {
    setEmailEntries((prev) => normalizeEmailEntries(prev.map((entry) => (entry.id === id ? { ...entry, value: nextValue } : entry))))
  }

  const removeEmailEntry = (id: string) => {
    setEmailEntries((prev) => normalizeEmailEntries(prev.filter((entry) => entry.id !== id)))
  }

  const requestEmails = () => {
    setComposerMode("emails")
    setMessages((prev) => {
      if (prev.some((item) => item.kind === "emailRequest")) return prev
      return [...prev, { id: crypto.randomUUID(), role: "bot", text: chatCopy.emailRequestIntro, kind: "emailRequest" }]
    })
  }

  const clearEmailEntries = () => setEmailEntries([])

  return {
    emailEntries,
    setEmailEntries,
    isCsvProcessing,
    appendEmailEntries,
    processCsvFile,
    handleEmailTextInput,
    updateEmailEntry,
    removeEmailEntry,
    requestEmails,
    clearEmailEntries,
  }
}
