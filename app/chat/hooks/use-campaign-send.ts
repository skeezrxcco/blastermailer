"use client"

import type { EmailEntry, Message } from "@/app/chat/chat-page.types"
import { computeValidationStats } from "@/app/chat/chat-page.utils"
import type { TemplateEditorData, TemplateOption } from "@/components/shared/newsletter/template-data"

export function useCampaignSend(
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setComposerMode: (mode: "prompt" | "emails") => void,
) {
  const confirmSendCampaign = async (
    emailEntries: EmailEntry[],
    selectedTemplate: TemplateOption | null,
    templateData: TemplateEditorData | null,
  ) => {
    if (!selectedTemplate || !templateData) return
    const stats = computeValidationStats(emailEntries)
    if (stats.valid === 0) return

    const campaignId = `cmp-${Date.now().toString().slice(-8)}`
    const validEmails = emailEntries.filter((e) => e.status === "valid").map((e) => e.value)

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "bot", text: `Sending campaign to ${stats.valid} recipients...`, campaignId },
    ])
    setComposerMode("prompt")

    try {
      const response = await fetch("/api/campaigns/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          subject: templateData.subjectLine || selectedTemplate.name,
          htmlContent: templateData.headline || "Campaign content",
          recipientEmails: validEmails,
          smtpSource: "platform",
        }),
      })

      if (!response.ok) {
        if (response.status === 429) {
          const errorData = (await response.json()) as { error?: string }
          throw new Error(errorData.error ?? "Email quota exceeded")
        }
        throw new Error("Failed to queue campaign")
      }

      const result = (await response.json()) as { jobId?: string }
      const jobId = result.jobId ?? campaignId

      setMessages((prev) =>
        prev.map((m) =>
          m.campaignId === campaignId
            ? { ...m, text: `Campaign queued! Sending to ${stats.valid} recipients... (0/${stats.valid})` }
            : m,
        ),
      )

      const eventSource = new EventSource(`/api/campaigns/progress?jobId=${encodeURIComponent(jobId)}`)

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as { status?: string; sent?: number; total?: number; failed?: number }
          if (data.status === "completed") {
            setMessages((prev) =>
              prev.map((m) =>
                m.campaignId === campaignId
                  ? { ...m, text: `✓ Campaign sent successfully! ${data.sent ?? stats.valid}/${data.total ?? stats.valid} delivered.` }
                  : m,
              ),
            )
            eventSource.close()
          } else if (data.status === "failed") {
            setMessages((prev) =>
              prev.map((m) =>
                m.campaignId === campaignId
                  ? { ...m, text: `✗ Campaign failed. ${data.sent ?? 0} sent, ${data.failed ?? 0} failed.` }
                  : m,
              ),
            )
            eventSource.close()
          } else if (data.status === "processing") {
            setMessages((prev) =>
              prev.map((m) =>
                m.campaignId === campaignId
                  ? { ...m, text: `Sending campaign... ${data.sent ?? 0}/${data.total ?? stats.valid} sent` }
                  : m,
              ),
            )
          }
        } catch { /* Ignore */ }
      }

      eventSource.onerror = () => { eventSource.close() }
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.campaignId === campaignId
            ? { ...m, text: `Failed to send campaign: ${error instanceof Error ? error.message : "Unknown error"}` }
            : m,
        ),
      )
    }
  }

  return { confirmSendCampaign }
}
