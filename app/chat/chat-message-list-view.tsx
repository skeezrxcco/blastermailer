"use client"

import { templateOptions, type TemplateEditorData, type TemplateOption } from "@/components/shared/newsletter/template-data"
import { cn } from "@/lib/utils"
import type { EmailEntry, Message } from "@/app/chat/chat-page.types"
import { AnimatedBotText } from "@/app/chat/chat-message-list"
import { EmailValidationPanel } from "@/app/chat/chat-email-panel"
import { TemplateSuggestionCard, SelectedTemplateReviewCard } from "@/app/chat/chat-template-cards"

export type MessageListProps = {
  messages: Message[]
  emailEntries: EmailEntry[]
  selectedTemplate: TemplateOption | null
  templateData: TemplateEditorData | null
  isPaidPlan: boolean
  onSelectTemplate: (t: TemplateOption) => void
  onChangeTemplate: () => void
  onContinueToEmails: () => void
  onEditEmailEntry: (id: string, value: string) => void
  onRemoveEmailEntry: (id: string) => void
  onConfirmSend: () => void
}

export function MessageList({
  messages, emailEntries, selectedTemplate, templateData, isPaidPlan,
  onSelectTemplate, onChangeTemplate,
  onContinueToEmails, onEditEmailEntry, onRemoveEmailEntry, onConfirmSend,
}: MessageListProps) {
  return (
    <>
      {messages.map((message) => (
        <div
          key={message.id}
          data-message-kind={message.kind ?? "plain"}
          className={cn(
            "animate-in fade-in slide-in-from-bottom-1 duration-300 flex",
            message.role === "bot" ? "justify-start" : "justify-end",
          )}
        >
          <div
            className={cn(
              "max-w-[88%] text-[15px] leading-relaxed",
              message.role === "bot"
                ? "text-zinc-200"
                : "rounded-2xl bg-zinc-800/60 px-4 py-2.5 text-zinc-100",
            )}
          >
            {message.attachments?.some((a) => a.type === "image") ? (
              <div className="mb-2 flex flex-wrap gap-2">
                {message.attachments.filter((a) => a.type === "image" && a.previewUrl).map((a) => (
                  <img
                    key={a.id}
                    src={a.previewUrl}
                    alt={a.name}
                    className="h-20 w-20 rounded-lg object-cover ring-1 ring-zinc-700/50"
                  />
                ))}
              </div>
            ) : null}
            {message.role === "bot"
              ? <AnimatedBotText text={message.text} />
              : <p>{message.text}</p>}

            {message.kind === "suggestions" ? (
              <div className="mt-3">
                <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-2 pr-1">
                  {(message.templateSuggestionIds?.length
                    ? message.templateSuggestionIds
                        .map((id) => templateOptions.find((t) => t.id === id))
                        .filter((t): t is TemplateOption => Boolean(t))
                    : templateOptions
                  )
                    .filter((t) => isPaidPlan || t.accessTier !== "pro")
                    .map((template) => (
                      <TemplateSuggestionCard
                        key={template.id}
                        template={template}
                        selected={selectedTemplate?.id === template.id}
                        onSelect={() => onSelectTemplate(template)}
                      />
                    ))}
                </div>
              </div>
            ) : null}

            {message.kind === "templateReview" && selectedTemplate && templateData ? (
              <div className="mt-3">
                <SelectedTemplateReviewCard
                  template={selectedTemplate}
                  data={templateData}
                  onChange={onChangeTemplate}
                  onContinue={onContinueToEmails}
                />
              </div>
            ) : null}

            {message.kind === "emailRequest" ? (
              <p className="mt-3 text-xs text-zinc-400">
                Use + to upload CSV, or paste emails directly in chat input and press Enter.
              </p>
            ) : null}

            {message.kind === "validation" ? (
              <EmailValidationPanel
                entries={emailEntries}
                onEditEntry={onEditEmailEntry}
                onRemoveEntry={onRemoveEmailEntry}
                onConfirmSend={onConfirmSend}
              />
            ) : null}
          </div>
        </div>
      ))}
    </>
  )
}
