import { sendEmail, type SendEmailResult } from "@/lib/email"
import nodemailer from "nodemailer"

// ---------------------------------------------------------------------------
// Email routing constants
// ---------------------------------------------------------------------------

/** Daily SES send cap for Pro users (300 emails/day per spec) */
const SES_DAILY_CAP = Number(process.env.SES_DAILY_CAP ?? "300")

/** Mailrelay monthly pool size for Free users (80k/month per spec) */
const MAILRELAY_MONTHLY_POOL = Number(process.env.MAILRELAY_MONTHLY_POOL ?? "80000")

export type SmtpSource = "platform" | "user" | "dedicated" | "ses" | "mailrelay"

export type SmtpConfig = {
  source: SmtpSource
  host?: string
  port?: number
  user?: string
  pass?: string
  from?: string
}

export type QueuedRecipient = {
  email: string
  status: "pending" | "sending" | "sent" | "failed"
  error?: string
  messageId?: string
  sentAt?: Date
}

export type EmailQueueJob = {
  id: string
  campaignId: string
  userId: string
  /** User plan used for email routing decisions */
  userPlan?: string
  subject: string
  html?: string
  text?: string
  from?: string
  smtpConfig: SmtpConfig
  recipients: QueuedRecipient[]
  status: "queued" | "processing" | "completed" | "failed"
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  progress: {
    total: number
    sent: number
    failed: number
  }
}

export type EmailQueueProgressEvent = {
  jobId: string
  campaignId: string
  recipientEmail: string
  status: "sent" | "failed"
  error?: string
  progress: EmailQueueJob["progress"]
}

type ProgressCallback = (event: EmailQueueProgressEvent) => void

const activeJobs = new Map<string, EmailQueueJob>()
const progressListeners = new Map<string, Set<ProgressCallback>>()

function generateJobId(): string {
  return `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function buildUserSmtpTransporter(config: SmtpConfig) {
  if (!config.host) {
    throw new Error("User SMTP requires host configuration")
  }

  const port = config.port ?? 587
  const auth = config.user && config.pass ? { user: config.user, pass: config.pass } : undefined

  return nodemailer.createTransport({
    host: config.host,
    port,
    secure: port === 465,
    ...(auth ? { auth } : {}),
  })
}

async function sendWithUserSmtp(
  config: SmtpConfig,
  input: { to: string; subject: string; html?: string; text?: string; from?: string },
): Promise<SendEmailResult> {
  const transporter = buildUserSmtpTransporter(config)
  const result = await transporter.sendMail({
    from: input.from ?? config.from ?? process.env.EMAIL_FROM ?? "no-reply@blastermailer.ai",
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  })

  return {
    provider: "smtp",
    id: result.messageId,
  }
}

/**
 * Resolve the effective email sending provider based on user plan.
 *
 * Routing rules (per docs/AI_MODES_AND_FINANCE.md):
 * - Free users  → Mailrelay SMTP pool (80k/month shared pool)
 * - Pro users   → AWS SES (300 emails/day hard cap)
 * - Custom SMTP → always use user-supplied credentials
 * - Dedicated   → platform dedicated SMTP
 */
function resolveEmailSource(smtpConfig: SmtpConfig, userPlan?: string): SmtpSource {
  if (smtpConfig.source === "user" || smtpConfig.source === "dedicated") {
    return smtpConfig.source
  }
  const isProduction = process.env.NODE_ENV === "production"
  if (!isProduction) return "platform"
  const isPro = ["pro", "premium", "enterprise"].includes((userPlan ?? "").toLowerCase())
  return isPro ? "ses" : "mailrelay"
}

async function sendWithSes(
  input: { to: string; subject: string; html?: string; text?: string; from?: string },
): Promise<SendEmailResult> {
  const region = process.env.AWS_SES_REGION ?? process.env.AWS_REGION ?? "eu-west-1"
  const accessKeyId = process.env.AWS_SES_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SES_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY
  const from = input.from ?? process.env.SES_FROM ?? process.env.EMAIL_FROM ?? "no-reply@blastermailer.ai"

  if (!accessKeyId || !secretAccessKey) {
    console.warn("[email-routing] AWS SES credentials not configured, falling back to platform SMTP")
    return sendEmail({ to: input.to, subject: input.subject, html: input.html, text: input.text, from })
  }

  const sesEndpoint = `https://email.${region}.amazonaws.com`
  const date = new Date().toUTCString()
  const rawMessage = [
    `From: ${from}`,
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    input.html ?? input.text ?? "",
  ].join("\r\n")

  const body = new URLSearchParams({
    Action: "SendRawEmail",
    "RawMessage.Data": Buffer.from(rawMessage).toString("base64"),
  })

  const response = await fetch(sesEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Date: date,
      "X-Amzn-Authorization": `AWS3-HTTPS AWSAccessKeyId=${accessKeyId},Algorithm=HmacSHA256,Signature=`,
    },
    body: body.toString(),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`SES error (${response.status}): ${text}`)
  }

  const xml = await response.text()
  const messageIdMatch = xml.match(/<MessageId>([^<]+)<\/MessageId>/)
  return {
    provider: "smtp",
    id: messageIdMatch?.[1],
  }
}

async function sendWithMailrelay(
  input: { to: string; subject: string; html?: string; text?: string; from?: string },
): Promise<SendEmailResult> {
  const host = process.env.MAILRELAY_SMTP_HOST ?? process.env.SMTP_HOST
  const port = Number(process.env.MAILRELAY_SMTP_PORT ?? process.env.SMTP_PORT ?? "587")
  const user = process.env.MAILRELAY_SMTP_USER ?? process.env.SMTP_USER
  const pass = process.env.MAILRELAY_SMTP_PASS ?? process.env.SMTP_PASS
  const from = input.from ?? process.env.MAILRELAY_FROM ?? process.env.EMAIL_FROM ?? "no-reply@blastermailer.ai"

  if (!host) {
    console.warn("[email-routing] Mailrelay SMTP not configured, falling back to platform email")
    return sendEmail({ to: input.to, subject: input.subject, html: input.html, text: input.text, from })
  }

  const auth = user && pass ? { user, pass } : undefined
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    ...(auth ? { auth } : {}),
  })

  const result = await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  })

  return { provider: "smtp", id: result.messageId }
}

async function sendSingleEmail(
  smtpConfig: SmtpConfig,
  input: { to: string; subject: string; html?: string; text?: string; from?: string },
  userPlan?: string,
): Promise<SendEmailResult> {
  const isProduction = process.env.NODE_ENV === "production"

  if (smtpConfig.source === "user") {
    return sendWithUserSmtp(smtpConfig, input)
  }

  if (!isProduction) {
    return sendEmail({
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      from: input.from ?? smtpConfig.from,
    })
  }

  const effectiveSource = resolveEmailSource(smtpConfig, userPlan)

  if (effectiveSource === "ses") {
    return sendWithSes(input)
  }

  if (effectiveSource === "mailrelay") {
    return sendWithMailrelay(input)
  }

  return sendEmail({
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    from: input.from ?? smtpConfig.from,
  })
}

function notifyProgress(jobId: string, event: EmailQueueProgressEvent) {
  const listeners = progressListeners.get(jobId)
  if (!listeners) return
  for (const callback of listeners) {
    try {
      callback(event)
    } catch {
      // Ignore listener errors
    }
  }
}

async function processJob(job: EmailQueueJob) {
  job.status = "processing"
  job.startedAt = new Date()

  const batchSize = Number(process.env.EMAIL_QUEUE_BATCH_SIZE) || 5
  const delayBetweenBatchesMs = Number(process.env.EMAIL_QUEUE_BATCH_DELAY_MS) || 1000
  const delayBetweenEmailsMs = Number(process.env.EMAIL_QUEUE_EMAIL_DELAY_MS) || 200

  const pendingRecipients = job.recipients.filter((r) => r.status === "pending")

  for (let i = 0; i < pendingRecipients.length; i += batchSize) {
    const batch = pendingRecipients.slice(i, i + batchSize)

    for (const recipient of batch) {
      recipient.status = "sending"

      try {
        const result = await sendSingleEmail(job.smtpConfig, {
          to: recipient.email,
          subject: job.subject,
          html: job.html,
          text: job.text,
          from: job.from,
        }, job.userPlan)

        recipient.status = "sent"
        recipient.messageId = result.id
        recipient.sentAt = new Date()
        job.progress.sent += 1
      } catch (error) {
        recipient.status = "failed"
        recipient.error = error instanceof Error ? error.message : "Send failed"
        job.progress.failed += 1
        console.error("[email-queue] recipient send failed", {
          jobId: job.id,
          campaignId: job.campaignId,
          recipientEmail: recipient.email,
          error: recipient.error,
        })
      }

      notifyProgress(job.id, {
        jobId: job.id,
        campaignId: job.campaignId,
        recipientEmail: recipient.email,
        status: recipient.status as "sent" | "failed",
        error: recipient.error,
        progress: { ...job.progress },
      })

      if (delayBetweenEmailsMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenEmailsMs))
      }
    }

    if (i + batchSize < pendingRecipients.length && delayBetweenBatchesMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatchesMs))
    }
  }

  const hasFailures = job.progress.failed > 0
  const allFailed = job.progress.failed === job.progress.total
  job.status = allFailed ? "failed" : "completed"
  job.completedAt = new Date()

  progressListeners.delete(job.id)
}

export function enqueueEmailJob(input: {
  campaignId: string
  userId: string
  /** User plan for email routing (free → Mailrelay, pro → SES) */
  userPlan?: string
  subject: string
  html?: string
  text?: string
  from?: string
  smtpConfig: SmtpConfig
  recipientEmails: string[]
}): EmailQueueJob {
  const jobId = generateJobId()

  const recipients: QueuedRecipient[] = input.recipientEmails.map((email) => ({
    email,
    status: "pending",
  }))

  const job: EmailQueueJob = {
    id: jobId,
    campaignId: input.campaignId,
    userId: input.userId,
    userPlan: input.userPlan,
    subject: input.subject,
    html: input.html,
    text: input.text,
    from: input.from,
    smtpConfig: input.smtpConfig,
    recipients,
    status: "queued",
    createdAt: new Date(),
    progress: {
      total: recipients.length,
      sent: 0,
      failed: 0,
    },
  }

  activeJobs.set(jobId, job)

  setImmediate(() => {
    processJob(job).catch((error) => {
      job.status = "failed"
      job.completedAt = new Date()
      console.error("[email-queue] job processing failed", {
        jobId: job.id,
        campaignId: job.campaignId,
        error: error instanceof Error ? error.message : String(error),
      })
    })
  })

  return job
}

export function getJobStatus(jobId: string): EmailQueueJob | null {
  return activeJobs.get(jobId) ?? null
}

export function subscribeToJobProgress(jobId: string, callback: ProgressCallback): () => void {
  if (!progressListeners.has(jobId)) {
    progressListeners.set(jobId, new Set())
  }
  progressListeners.get(jobId)!.add(callback)

  return () => {
    const listeners = progressListeners.get(jobId)
    if (listeners) {
      listeners.delete(callback)
      if (listeners.size === 0) {
        progressListeners.delete(jobId)
      }
    }
  }
}

export function getActiveJobsForUser(userId: string): EmailQueueJob[] {
  return Array.from(activeJobs.values()).filter(
    (job) => job.userId === userId && (job.status === "queued" || job.status === "processing"),
  )
}
