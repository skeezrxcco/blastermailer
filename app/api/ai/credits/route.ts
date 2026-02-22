import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { getAiCreditsSnapshot } from "@/lib/ai/credits"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const snapshot = await getAiCreditsSnapshot({
    userId: session.user.id,
    userPlan: session.user.plan,
  })

  return NextResponse.json({
    limited: snapshot.limited,
    maxCredits: snapshot.maxCredits,
    remainingCredits: snapshot.remainingCredits,
    usedCredits: snapshot.usedCredits,
    windowHours: snapshot.windowHours,
    resetAt: snapshot.resetAt?.toISOString() ?? null,
    congestion: snapshot.congestion,
    monthlyBudgetUsd: snapshot.monthlyBudgetUsd,
    remainingBudgetUsd: snapshot.remainingBudgetUsd,
  })
}

