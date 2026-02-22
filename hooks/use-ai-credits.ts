"use client"

import { useEffect, useState } from "react"

type AiCreditsPayload = {
  limited: boolean
  maxCredits: number | null
  remainingCredits: number | null
  usedCredits: number | null
  windowHours: number | null
  resetAt: string | null
  congestion: "low" | "moderate" | "high" | "severe"
  monthlyBudgetUsd: number
  remainingBudgetUsd: number
}

const defaultCredits: AiCreditsPayload = {
  limited: true,
  maxCredits: 25,
  remainingCredits: 25,
  usedCredits: 0,
  windowHours: 6,
  resetAt: null,
  congestion: "low",
  monthlyBudgetUsd: 0.25,
  remainingBudgetUsd: 0.25,
}

export function useAiCredits() {
  const [credits, setCredits] = useState<AiCreditsPayload>(defaultCredits)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const response = await fetch("/api/ai/credits", {
          method: "GET",
          cache: "no-store",
        })
        if (!response.ok) return
        const payload = (await response.json()) as AiCreditsPayload
        if (!cancelled) setCredits(payload)
      } catch {
        // Keep fallback.
      }
    }

    void load()
    const interval = window.setInterval(load, 45_000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  return credits
}

