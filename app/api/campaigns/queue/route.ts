import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"

import { authOptions } from "@/lib/auth"
import { enqueueEmailJob, type SmtpConfig, type SmtpSource } from "@/lib/email-queue"
import { checkEmailQuota, consumeEmailQuota } from "@/lib/email-quota"
import {
  normalizeTemplateVariables,
  renderEmailTemplateFromHbs,
  type TemplateRenderVariables,
} from "@/lib/email-template-hbs"

function normalizeSmtpSource(value?: string): SmtpSource {
  const normalized = String(value ?? "platform").trim().toLowerCase()
  if (normalized === "user") return "user"
  if (normalized === "dedicated") return "dedicated"
  return "platform"
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json()) as {
    campaignId?: string
    subject?: string
    html?: string
    templateId?: string
    templateVariables?: Partial<TemplateRenderVariables>
    text?: string
    from?: string
    recipientEmails?: string[]
    smtpSource?: string
    smtpHost?: string
    smtpPort?: number
    smtpUser?: string
    smtpPass?: string
    scheduledAt?: string
  }

  const campaignId = String(body.campaignId ?? `cmp-${Date.now().toString(36)}`).trim()
  const templateId = String(body.templateId ?? "").trim()
  const normalizedTemplateVariables = templateId
    ? normalizeTemplateVariables(templateId, body.templateVariables ?? {})
    : null
  const renderedFromTemplate = templateId
    ? renderEmailTemplateFromHbs(templateId, normalizedTemplateVariables!)
    : null
  const resolvedHtml = String(body.html ?? "").trim() || renderedFromTemplate?.html || ""
  const subject = String(body.subject ?? "").trim() || normalizedTemplateVariables?.subject || ""
  if (!subject) {
    return NextResponse.json({ error: "Subject is required" }, { status: 422 })
  }

  if (!resolvedHtml) {
    return NextResponse.json({ error: "HTML content is required" }, { status: 422 })
  }

  const recipientEmails = (body.recipientEmails ?? []).filter(
    (email) => typeof email === "string" && email.includes("@"),
  )
  if (recipientEmails.length === 0) {
    return NextResponse.json({ error: "At least one recipient email is required" }, { status: 422 })
  }

  const quota = await checkEmailQuota({
    userId: session.user.id,
    userPlan: session.user.plan,
    emailCount: recipientEmails.length,
  })

  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: `Email quota exceeded. You have ${quota.remaining}/${quota.limit} emails remaining this month. Resets on ${quota.resetAt?.toLocaleDateString() ?? "next month"}.`,
        quota: {
          remaining: quota.remaining,
          limit: quota.limit,
          resetAt: quota.resetAt,
        },
      },
      { status: 429 },
    )
  }

  const smtpSource = normalizeSmtpSource(body.smtpSource)
  const smtpConfig: SmtpConfig = {
    source: smtpSource,
    from: body.from,
  }

  if (smtpSource === "user") {
    if (!body.smtpHost) {
      return NextResponse.json({ error: "SMTP host is required for custom SMTP" }, { status: 422 })
    }
    smtpConfig.host = body.smtpHost
    smtpConfig.port = body.smtpPort
    smtpConfig.user = body.smtpUser
    smtpConfig.pass = body.smtpPass
  }

  const job = enqueueEmailJob({
    campaignId,
    userId: session.user.id,
    userPlan: session.user.plan,
    subject,
    html: resolvedHtml,
    text: body.text,
    from: body.from,
    smtpConfig,
    recipientEmails,
  })

  await consumeEmailQuota({
    userId: session.user.id,
    userPlan: session.user.plan,
    emailCount: recipientEmails.length,
  })

  return NextResponse.json({
    jobId: job.id,
    campaignId: job.campaignId,
    status: job.status,
    recipientCount: job.recipients.length,
    progress: job.progress,
    quota: {
      remaining: quota.remaining - recipientEmails.length,
      limit: quota.limit,
    },
  })
}
