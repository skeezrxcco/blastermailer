import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import {
  archiveWorkflowSession,
  getLatestWorkflowSession,
  getWorkflowSessionByConversationId,
  listWorkflowSessions,
  loadOrCreateWorkflowSession,
} from "@/lib/ai/workflow-store"
import { deleteMessagesByConversation } from "@/lib/messaging"

const DEFAULT_SESSIONS_LIMIT = 10
const MAX_SESSIONS_LIMIT = 50

function parseQueryInteger(input: string | null, fallback: number, range?: { min?: number; max?: number }) {
  const parsed = Number.parseInt(String(input ?? ""), 10)
  if (!Number.isFinite(parsed)) return fallback
  const min = range?.min ?? Number.NEGATIVE_INFINITY
  const max = range?.max ?? Number.POSITIVE_INFINITY
  return Math.min(Math.max(parsed, min), max)
}

function mapSessionPayload(session: {
  conversationId: string
  state: { state: string; intent: string; selectedTemplateId: string | null; recipientStats: unknown; summary: string | null; context: unknown }
  lastActivityAt: Date
}) {
  return {
    conversationId: session.conversationId,
    state: session.state.state,
    intent: session.state.intent,
    selectedTemplateId: session.state.selectedTemplateId,
    recipientStats: session.state.recipientStats,
    summary: session.state.summary,
    context: session.state.context,
    lastActivityAt: session.lastActivityAt,
  }
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const conversationId = url.searchParams.get("conversationId")
  const sessionsLimit = parseQueryInteger(url.searchParams.get("sessionsLimit"), DEFAULT_SESSIONS_LIMIT, { min: 1, max: MAX_SESSIONS_LIMIT })
  const sessionsOffset = parseQueryInteger(url.searchParams.get("sessionsOffset"), 0, { min: 0 })

  const pagedSessions = await listWorkflowSessions({
    userId: session.user.id,
    limit: sessionsLimit + 1,
    offset: sessionsOffset,
  })
  const hasMore = pagedSessions.length > sessionsLimit
  const sessions = hasMore ? pagedSessions.slice(0, sessionsLimit) : pagedSessions
  const sessionsMeta = {
    limit: sessionsLimit,
    offset: sessionsOffset,
    nextOffset: sessionsOffset + sessions.length,
    hasMore,
  }

  const selected = conversationId
    ? await getWorkflowSessionByConversationId({ userId: session.user.id, conversationId })
    : await getLatestWorkflowSession(session.user.id)

  if (!selected) {
    return NextResponse.json({
      session: null,
      sessions,
      sessionsMeta,
      checkpoint: null,
    })
  }

  return NextResponse.json({
    session: mapSessionPayload(selected.session),
    sessions,
    sessionsMeta,
    checkpoint: selected.lastCheckpoint
      ? {
          state: selected.lastCheckpoint.state,
          payload: selected.lastCheckpoint.payload,
          createdAt: selected.lastCheckpoint.createdAt,
        }
      : null,
  })
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const conversationId = url.searchParams.get("conversationId")
  const sessionsLimit = parseQueryInteger(url.searchParams.get("sessionsLimit"), DEFAULT_SESSIONS_LIMIT, { min: 1, max: MAX_SESSIONS_LIMIT })
  const sessionsOffset = parseQueryInteger(url.searchParams.get("sessionsOffset"), 0, { min: 0 })
  if (!conversationId) {
    return NextResponse.json({ error: "conversationId is required" }, { status: 422 })
  }

  const [archived] = await Promise.all([
    archiveWorkflowSession({ userId: session.user.id, conversationId }),
    deleteMessagesByConversation({ userId: session.user.id, conversationId }),
  ])

  const pagedSessions = await listWorkflowSessions({
    userId: session.user.id,
    limit: sessionsLimit + 1,
    offset: sessionsOffset,
  })
  const hasMore = pagedSessions.length > sessionsLimit
  const sessions = hasMore ? pagedSessions.slice(0, sessionsLimit) : pagedSessions
  const sessionsMeta = {
    limit: sessionsLimit,
    offset: sessionsOffset,
    nextOffset: sessionsOffset + sessions.length,
    hasMore,
  }

  return NextResponse.json({ deleted: archived, sessions, sessionsMeta })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { conversationId?: string | null } = {}
  try {
    body = (await request.json()) as { conversationId?: string | null }
  } catch {
    body = {}
  }

  const conversationId = String(body.conversationId ?? "").trim() || null
  const created = await loadOrCreateWorkflowSession({
    userId: session.user.id,
    conversationId,
  })

  const sessionsLimit = DEFAULT_SESSIONS_LIMIT
  const pagedSessions = await listWorkflowSessions({
    userId: session.user.id,
    limit: sessionsLimit + 1,
    offset: 0,
  })
  const hasMore = pagedSessions.length > sessionsLimit
  const sessions = hasMore ? pagedSessions.slice(0, sessionsLimit) : pagedSessions
  const sessionsMeta = {
    limit: sessionsLimit,
    offset: 0,
    nextOffset: sessions.length,
    hasMore,
  }

  return NextResponse.json({
    session: mapSessionPayload(created),
    sessions,
    sessionsMeta,
  })
}
