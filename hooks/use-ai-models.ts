"use client"

import { useEffect, useState } from "react"
import type { AiQualityMode } from "@/app/chat/chat-page.types"

export type AvailableMode = {
  mode: AiQualityMode
  available: boolean
  modelId: string | null
  modelLabel: string | null
  provider: string | null
  locked: boolean
}

export type AiModelsInfo = {
  modes: AvailableMode[]
  loading: boolean
}

const defaultModes: AvailableMode[] = [
  { mode: "fast", available: true, modelId: null, modelLabel: null, provider: null, locked: false },
  { mode: "boost", available: true, modelId: null, modelLabel: null, provider: null, locked: true },
  { mode: "max", available: true, modelId: null, modelLabel: null, provider: null, locked: true },
]

export function useAiModels(): AiModelsInfo {
  const [modes, setModes] = useState<AvailableMode[]>(defaultModes)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const response = await fetch("/api/ai/models", {
          method: "GET",
          cache: "no-store",
        })
        if (!response.ok) return
        const payload = await response.json()
        if (!cancelled && Array.isArray(payload.modes)) {
          setModes(payload.modes)
        }
      } catch {
        // Keep defaults
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  return { modes, loading }
}
