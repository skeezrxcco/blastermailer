# AI Chat Orchestration Scope (Task Group 4)

This branch starts Task Group 4 from `project-management/TASKS.md` with a practical orchestration foundation.

## Implemented in this branch

- Added stage model and transition helpers in `lib/ai-chat-orchestration.ts`:
  - stages: `intake`, `template_selection`, `audience_collection`, `review`, `send_confirmation`, `completed`
  - stage inference from prompt keywords
  - monotonic stage progression (prevents accidental regressions)
  - conversation id normalization/generation
  - prompt sanitization guardrail
  - stage-specific system prompts
- Updated `app/api/ai/generate/route.ts` to:
  - accept `conversationId` and `stage`
  - infer/resolve active stage
  - inject stage guardrails into system prompt
  - persist `conversationId` and `stage` metadata in messages
  - return `conversationId` and `stage` in API response
  - include `latencyMs` telemetry in assistant message metadata

## Next slices (still open)

1. Stream bot typing token-by-token via SSE/WebSocket.
2. Persist workflow state explicitly (session table) instead of metadata-only inference.
3. Add deterministic routing policies by plan/tier/cost and usage budget.
4. Add moderation/safety policies before generation.
5. Add end-to-end telemetry dashboard (latency/error/provider/stage).

