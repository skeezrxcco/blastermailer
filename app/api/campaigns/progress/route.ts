import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"

import { authOptions } from "@/lib/auth"
import { getJobStatus, subscribeToJobProgress, type EmailQueueProgressEvent } from "@/lib/email-queue"

function resolveFailureReason(job: NonNullable<ReturnType<typeof getJobStatus>>) {
  return job.recipients.find((recipient) => recipient.status === "failed" && recipient.error)?.error ?? null
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const url = new URL(request.url)
  const jobId = url.searchParams.get("jobId")
  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 422 })
  }

  const job = getJobStatus(jobId)
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  if (job.userId !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const sendEvent = (event: EmailQueueProgressEvent) => {
        const data = JSON.stringify(event)
        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
      }

      const pushCompleteEvent = (status: "completed" | "failed", progress: typeof job.progress, error?: string | null) => {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "complete",
              status,
              progress,
              ...(error ? { error } : {}),
            })}\n\n`,
          ),
        )
      }

      if (job.status === "completed" || job.status === "failed") {
        sendEvent({
          jobId: job.id,
          campaignId: job.campaignId,
          recipientEmail: "",
          status: job.status === "failed" ? "failed" : "sent",
          error: job.status === "failed" ? resolveFailureReason(job) ?? undefined : undefined,
          progress: { ...job.progress },
        })
        pushCompleteEvent(job.status, { ...job.progress }, resolveFailureReason(job))
        controller.close()
        return
      }

      sendEvent({
        jobId: job.id,
        campaignId: job.campaignId,
        recipientEmail: "",
        status: "sent",
        progress: { ...job.progress },
      })

      const unsubscribe = subscribeToJobProgress(jobId, (event) => {
        try {
          sendEvent(event)

          const isDone =
            event.progress.sent + event.progress.failed >= event.progress.total
          if (isDone) {
            const latestJob = getJobStatus(jobId)
            const status = latestJob?.status === "failed" ? "failed" : "completed"
            const error = status === "failed"
              ? (event.error ?? (latestJob ? resolveFailureReason(latestJob) : null))
              : null
            pushCompleteEvent(status, event.progress, error)
            controller.close()
            unsubscribe()
          }
        } catch {
          unsubscribe()
        }
      })

      request.signal.addEventListener("abort", () => {
        unsubscribe()
        try {
          controller.close()
        } catch {
          // Already closed
        }
      })
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
