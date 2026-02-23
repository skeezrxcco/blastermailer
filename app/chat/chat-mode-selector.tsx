"use client"

import { ChevronDown } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { modelChoices, specificModelOptions } from "@/app/chat/chat-page.types"

export function AiModeSelector({
  selectedModelChoice,
  selectedSpecificModel,
  isPaidPlan,
  isOutOfCredits,
  onModelChoiceChange,
  onSpecificModelChange,
}: {
  selectedModelChoice: string
  selectedSpecificModel: string | null
  isPaidPlan: boolean
  isOutOfCredits: boolean
  onModelChoiceChange: (id: string) => void
  onSpecificModelChange: (id: string | null) => void
}) {
  const activeChoice = modelChoices.find((c) => c.id === selectedModelChoice) ?? modelChoices[0]
  const activeSpecific = specificModelOptions.find((m) => m.id === selectedSpecificModel)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={isOutOfCredits}
          className="flex h-9 items-center gap-1.5 rounded-full bg-zinc-950/80 pl-3.5 pr-3 text-[11px] font-medium text-zinc-200 outline-none transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:text-zinc-500"
          aria-label="AI model"
        >
          <span>{activeChoice.label}</span>
          {activeSpecific ? (
            <span className="text-zinc-500">· {activeSpecific.label}</span>
          ) : null}
          <span className="flex items-center gap-0.5 rounded-full bg-zinc-800/80 px-1.5 py-0.5">
            <span className="text-[10px] font-medium text-zinc-400">{activeChoice.quotaMultiplier}x</span>
            <ChevronDown className="h-3 w-3 text-zinc-400" />
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuRadioGroup value={selectedModelChoice} onValueChange={onModelChoiceChange}>
          {modelChoices.map((choice) => {
            const locked = !isPaidPlan && choice.requiresPro
            const modelsForMode = specificModelOptions.filter((m) => m.mode === choice.mode)

            if (modelsForMode.length === 0) {
              return (
                <DropdownMenuRadioItem
                  key={choice.id}
                  value={choice.id}
                  disabled={locked}
                  className="text-sm"
                >
                  <span className="flex-1">{choice.label}</span>
                  {locked ? <span className="text-[10px] text-zinc-500">Pro</span> : null}
                </DropdownMenuRadioItem>
              )
            }

            return (
              <DropdownMenuSub key={choice.id}>
                <DropdownMenuSubTrigger disabled={locked} className="text-sm">
                  <span className="flex-1">{choice.label}</span>
                  {locked ? <span className="text-[10px] text-zinc-500">Pro</span> : null}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-52">
                  <DropdownMenuRadioGroup
                    value={selectedModelChoice === choice.id ? (selectedSpecificModel ?? "default") : ""}
                    onValueChange={(value) => {
                      onModelChoiceChange(choice.id)
                      onSpecificModelChange(value === "default" ? null : value)
                    }}
                  >
                    <DropdownMenuRadioItem value="default" className="text-xs">
                      <span className="flex-1">Default</span>
                      <span className="text-[10px] text-zinc-500">{choice.quotaMultiplier}x</span>
                    </DropdownMenuRadioItem>
                    <DropdownMenuSeparator />
                    {modelsForMode.map((model) => (
                      <DropdownMenuRadioItem key={model.id} value={model.id} className="text-xs">
                        {model.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
