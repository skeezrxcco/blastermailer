"use client"

import { ChevronDown } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { modelChoices } from "@/app/chat/chat-page.types"
import type { AvailableMode } from "@/hooks/use-ai-models"

export function AiModeSelector({
  selectedModelChoice,
  isOutOfCredits,
  onModelChoiceChange,
  availableModes,
}: {
  selectedModelChoice: string
  isOutOfCredits: boolean
  onModelChoiceChange: (id: string) => void
  availableModes: AvailableMode[]
}) {
  const activeChoice = modelChoices.find((c) => c.id === selectedModelChoice) ?? modelChoices[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={isOutOfCredits}
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-left outline-none transition hover:bg-zinc-800/40 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="AI model"
        >
          <span className="text-[11px] font-medium text-zinc-300">{activeChoice.label}</span>
          <ChevronDown className="h-2.5 w-2.5 text-zinc-500" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44 border-zinc-800 bg-zinc-950 p-1">
        <DropdownMenuRadioGroup value={selectedModelChoice} onValueChange={onModelChoiceChange}>
          {modelChoices.map((choice) => {
            const modeInfo = availableModes.find((m) => m.mode === choice.mode)
            const notAvailable = modeInfo ? !modeInfo.available : false
            const locked = modeInfo?.locked ?? false
            const disabled = notAvailable || locked

            return (
              <DropdownMenuRadioItem
                key={choice.id}
                value={choice.id}
                disabled={disabled}
                className="rounded-sm text-xs text-zinc-300 focus:bg-zinc-800/40 focus:text-zinc-100"
              >
                <span className="flex-1">{choice.label}</span>
                {locked ? (
                  <span className="text-[10px] text-zinc-600">Pro</span>
                ) : notAvailable ? (
                  <span className="text-[10px] text-zinc-600">N/A</span>
                ) : null}
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
