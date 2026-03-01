import { prisma } from "@/lib/prisma"

const FREE_TIER_MONTHLY_LIMIT = 100

function getMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function getNextMonthStart(): Date {
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return nextMonth
}

export async function checkEmailQuota(input: { userId: string; userPlan?: string; emailCount: number }): Promise<{
  allowed: boolean
  remaining: number
  limit: number
  resetAt: Date | null
}> {
  const plan = (input.userPlan ?? "").toLowerCase()
  const isPaid = plan === "pro" || plan === "premium" || plan === "enterprise"

  if (isPaid) {
    return {
      allowed: true,
      remaining: Infinity,
      limit: Infinity,
      resetAt: null,
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { emailsSentThisMonth: true, emailQuotaResetAt: true },
  })

  if (!user) {
    return {
      allowed: false,
      remaining: 0,
      limit: FREE_TIER_MONTHLY_LIMIT,
      resetAt: getNextMonthStart(),
    }
  }

  const now = new Date()
  const resetAt = user.emailQuotaResetAt ?? getNextMonthStart()
  const needsReset = now >= resetAt

  let currentCount = user.emailsSentThisMonth ?? 0
  if (needsReset) {
    currentCount = 0
    await prisma.user.update({
      where: { id: input.userId },
      data: {
        emailsSentThisMonth: 0,
        emailQuotaResetAt: getNextMonthStart(),
      },
    })
  }

  const remaining = Math.max(0, FREE_TIER_MONTHLY_LIMIT - currentCount)
  const allowed = currentCount + input.emailCount <= FREE_TIER_MONTHLY_LIMIT

  return {
    allowed,
    remaining,
    limit: FREE_TIER_MONTHLY_LIMIT,
    resetAt: needsReset ? getNextMonthStart() : resetAt,
  }
}

export async function consumeEmailQuota(input: { userId: string; userPlan?: string; emailCount: number }): Promise<void> {
  const plan = (input.userPlan ?? "").toLowerCase()
  const isPaid = plan === "pro" || plan === "premium" || plan === "enterprise"

  if (isPaid) return

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { emailsSentThisMonth: true, emailQuotaResetAt: true },
  })

  if (!user) return

  const now = new Date()
  const resetAt = user.emailQuotaResetAt ?? getNextMonthStart()
  const needsReset = now >= resetAt

  if (needsReset) {
    await prisma.user.update({
      where: { id: input.userId },
      data: {
        emailsSentThisMonth: input.emailCount,
        emailQuotaResetAt: getNextMonthStart(),
      },
    })
  } else {
    await prisma.user.update({
      where: { id: input.userId },
      data: {
        emailsSentThisMonth: {
          increment: input.emailCount,
        },
      },
    })
  }
}
