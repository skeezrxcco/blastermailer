"use client"

import type { EditorThemeState, EmailEntry, Message } from "@/app/chat/chat-page.types"
import { computeValidationStats } from "@/app/chat/chat-page.utils"
import type { TemplateEditorData, TemplateOption } from "@/components/shared/newsletter/template-data"

type ConfirmSendInput = {
  emailEntries: EmailEntry[]
  selectedTemplate: TemplateOption | null
  templateData: TemplateEditorData | null
  themeState?: EditorThemeState | null
  generatedHtml?: string | null
  generatedSubject?: string | null
}

type TemplatePayload = {
  templateId: string
  templateVariables: {
    subject: string
    preheader: string
    templateName: string
    title: string
    subtitle: string
    content: string
    cta: string
    image: string
    footer: string
    accentColor: string
    backgroundColor: string
    buttonColor: string
    buttonTextColor: string
  }
}

function buildTemplatePayload(
  selectedTemplate: TemplateOption | null,
  templateData: TemplateEditorData | null,
  themeState?: EditorThemeState | null,
): TemplatePayload | null {
  if (!selectedTemplate || !templateData) return null

  const mergedContent = [
    templateData.offerDescription,
    `${templateData.dishOneTitle}: ${templateData.dishOneDescription}`,
    `${templateData.dishTwoTitle}: ${templateData.dishTwoDescription}`,
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n\n")

  return {
    templateId: selectedTemplate.id,
    templateVariables: {
      subject: templateData.subjectLine || selectedTemplate.name,
      preheader: templateData.preheader,
      templateName: selectedTemplate.name,
      title: templateData.headline || selectedTemplate.name,
      subtitle: templateData.subheadline || templateData.offerTitle,
      content: mergedContent || templateData.offerDescription || "Campaign details",
      cta: templateData.ctaText || "Learn More",
      image: templateData.heroImage || selectedTemplate.heroImage,
      footer: templateData.footerNote || `You're receiving this from ${templateData.restaurantName}.`,
      accentColor: themeState?.accentA ?? selectedTemplate.accentA,
      backgroundColor: themeState?.surface ?? selectedTemplate.surface,
      buttonColor: themeState?.ctaBg ?? selectedTemplate.ctaBg,
      buttonTextColor: themeState?.ctaText ?? selectedTemplate.ctaText,
    },
  }
}

export function useCampaignSend(
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setComposerMode: (mode: "prompt" | "emails") => void,
) {
  const confirmSendCampaign = async ({
    emailEntries,
    selectedTemplate,
    templateData,
    themeState,
    generatedHtml,
    generatedSubject,
  }: ConfirmSendInput) => {
    const stats = computeValidationStats(emailEntries)
    if (stats.valid === 0) return

    const campaignId = `cmp-${Date.now().toString().slice(-8)}`
    const validEmails = emailEntries.filter((e) => e.status === "valid").map((e) => e.value)
    const templatePayload = buildTemplatePayload(selectedTemplate, templateData, themeState)
    const html = generatedHtml?.trim() || null
    const subject =
      generatedSubject?.trim() ||
      templateData?.subjectLine?.trim() ||
      selectedTemplate?.name ||
      "Campaign"

    if (!html && !templatePayload) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "bot",
          text: "I need a generated email template before sending. Ask me to generate one first.",
        },
      ])
      return
    }

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "bot", text: `Sending campaign to ${stats.valid} recipients...`, campaignId },
    ])
    setComposerMode("prompt")

    try {
      const response = await fetch("/api/campaigns/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          subject,
          html,
          templateId: templatePayload?.templateId,
          templateVariables: templatePayload?.templateVariables,
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
      let lastFailureReason: string | null = null

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as {
            type?: string
            status?: string
            error?: string
            progress?: { total?: number; sent?: number; failed?: number }
          }
          if (data.status === "failed" && data.error) {
            lastFailureReason = data.error
          }

          // Final completion event from server
          if (data.type === "complete") {
            const sent = data.progress?.sent ?? stats.valid
            const total = data.progress?.total ?? stats.valid
            const failed = data.progress?.failed ?? 0
            setMessages((prev) =>
              prev.map((m) =>
                m.campaignId === campaignId
                  ? { ...m, text: failed > 0 && sent === 0
                      ? `✗ Campaign failed. ${sent} sent, ${failed} failed.${lastFailureReason ? ` Reason: ${lastFailureReason}` : ""}`
                      : `✓ Campaign sent! ${sent}/${total} delivered${failed > 0 ? ` (${failed} failed)` : ""}.`
                    }
                  : m,
              ),
            )
            eventSource.close()
            return
          }

          // Per-recipient progress events (status = "sent" | "failed")
          if (data.progress) {
            const sent = data.progress.sent ?? 0
            const total = data.progress.total ?? stats.valid
            const failed = data.progress.failed ?? 0
            const done = sent + failed >= total

            if (done) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.campaignId === campaignId
                    ? { ...m, text: failed > 0 && sent === 0
                        ? `✗ Campaign failed. ${sent} sent, ${failed} failed.${lastFailureReason ? ` Reason: ${lastFailureReason}` : ""}`
                        : `✓ Campaign sent! ${sent}/${total} delivered${failed > 0 ? ` (${failed} failed)` : ""}.`
                      }
                    : m,
                ),
              )
              eventSource.close()
            } else {
              setMessages((prev) =>
                prev.map((m) =>
                  m.campaignId === campaignId
                    ? { ...m, text: `Sending campaign... ${sent}/${total} sent${failed > 0 ? ` (${failed} failed)` : ""}` }
                    : m,
                ),
              )
            }
          }
        } catch { /* Ignore malformed events */ }
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
