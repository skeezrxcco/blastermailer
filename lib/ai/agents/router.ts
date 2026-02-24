/**
 * Agent Router — selects the best agent for a given user prompt and workflow state.
 *
 * Routing strategy:
 * 1. Keyword scoring — match prompt tokens against each agent's intentKeywords
 * 2. Workflow state affinity — some states strongly imply a specific agent
 * 3. Fallback — if no strong match, use creative_designer (most general)
 */

import type { AgentId, AgentProfile } from "@/lib/ai/agents/profiles"
import { AGENT_PROFILES } from "@/lib/ai/agents/profiles"
import type { AiWorkflowState } from "@/lib/ai/types"

export type RouterResult = {
  agentId: AgentId
  confidence: number
  reason: string
}

/** Workflow states that strongly imply a specific agent */
const STATE_AFFINITY: Partial<Record<AiWorkflowState, AgentId>> = {
  TEMPLATE_DISCOVERY: "creative_designer",
  TEMPLATE_SELECTED: "creative_designer",
  CONTENT_REFINE: "creative_designer",
  AUDIENCE_COLLECTION: "campaign_operator",
  VALIDATION_REVIEW: "campaign_operator",
  SEND_CONFIRMATION: "campaign_operator",
  QUEUED: "campaign_operator",
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-\/]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1)
}

function scoreAgent(profile: AgentProfile, tokens: string[], fullPrompt: string): number {
  let score = 0
  const lower = fullPrompt.toLowerCase()

  for (const keyword of profile.intentKeywords) {
    if (keyword.includes(" ")) {
      // Multi-word keyword — check full prompt
      if (lower.includes(keyword)) score += 3
    } else {
      // Single-word keyword — check tokens
      if (tokens.includes(keyword)) score += 2
    }
  }

  return score
}

export function routeToAgent(prompt: string, workflowState: AiWorkflowState): RouterResult {
  // 1. Check state affinity first — if we're mid-workflow, stay with the right agent
  const stateAgent = STATE_AFFINITY[workflowState]
  if (stateAgent && workflowState !== "INTENT_CAPTURE" && workflowState !== "GOAL_BRIEF") {
    return {
      agentId: stateAgent,
      confidence: 0.9,
      reason: `Workflow state ${workflowState} implies ${stateAgent}`,
    }
  }

  // 2. Score each agent by keyword match
  const tokens = tokenize(prompt)
  const scores: { agentId: AgentId; score: number }[] = []

  for (const profile of Object.values(AGENT_PROFILES)) {
    scores.push({
      agentId: profile.id,
      score: scoreAgent(profile, tokens, prompt),
    })
  }

  scores.sort((a, b) => b.score - a.score)
  const best = scores[0]
  const second = scores[1]

  // 3. If clear winner (>= 2 points ahead or score >= 4), use it
  if (best.score >= 4 || (best.score >= 2 && best.score - (second?.score ?? 0) >= 2)) {
    return {
      agentId: best.agentId,
      confidence: Math.min(1, best.score / 8),
      reason: `Keyword match: ${best.score} points for ${best.agentId}`,
    }
  }

  // 4. If score is low but non-zero, use the best match with lower confidence
  if (best.score > 0) {
    return {
      agentId: best.agentId,
      confidence: Math.min(0.6, best.score / 6),
      reason: `Weak keyword match: ${best.score} points for ${best.agentId}`,
    }
  }

  // 5. Fallback: creative_designer handles the widest range of general requests
  return {
    agentId: "creative_designer",
    confidence: 0.3,
    reason: "No strong keyword match — defaulting to creative_designer",
  }
}
