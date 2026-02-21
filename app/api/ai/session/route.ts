import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { getLatestWorkflowSession } from "@/lib/ai/workflow-store"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const latest = await getLatestWorkflowSession(session.user.id)
  if (!latest) {
    return NextResponse.json({ session: null })
  }

  return NextResponse.json({
    session: {
      conversationId: latest.session.conversationId,
      state: latest.session.state.state,
      intent: latest.session.state.intent,
      selectedTemplateId: latest.session.state.selectedTemplateId,
      recipientStats: latest.session.state.recipientStats,
      summary: latest.session.state.summary,
      context: latest.session.state.context,
      lastActivityAt: latest.session.lastActivityAt,
    },
    checkpoint: latest.lastCheckpoint
      ? {
          state: latest.lastCheckpoint.state,
          payload: latest.lastCheckpoint.payload,
          createdAt: latest.lastCheckpoint.createdAt,
        }
      : null,
  })
}

