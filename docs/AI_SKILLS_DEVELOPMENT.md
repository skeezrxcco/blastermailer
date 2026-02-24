# AI Skills Development Guide

This guide explains how to develop, test, and extend AI skills in Blastermailer.

## What is a Skill?

A skill is an atomic capability that an agent can invoke. Skills are defined in `lib/ai/agents/skills.ts` and registered in the `SKILLS_REGISTRY`.

There are three categories:

- **Workflow skills** — Change the campaign workflow state (e.g. `suggest_templates`, `validate_recipients`)
- **Generative skills** — Produce AI-generated output like HTML emails or HBS templates (e.g. `compose_simple_email`, `generate_hbs_template`)
- **Advisory skills** — Provide analysis, recommendations, or insights without state changes (e.g. `analyze_audience`, `forecast_roi`)

## Skill Definition Schema

```typescript
type SkillDefinition = {
  id: string                    // Unique identifier (snake_case)
  name: string                  // Human-readable name
  description: string           // What the skill does (shown to the planner AI)
  parameters: Record<string, {  // Arguments the skill accepts
    type: string
    description: string
    required?: boolean
  }>
  nextState?: AiWorkflowState   // State transition (workflow skills only)
  impliedIntent?: AiWorkflowIntent  // Intent this skill implies
  generative?: boolean          // Does it trigger an AI generation step?
  generativeSystemPrompt?: string   // System prompt for the generation step
}
```

## Step-by-Step: Adding a New Skill

### 1. Define the Skill

In `lib/ai/agents/skills.ts`, add a new `SkillDefinition`:

```typescript
const mySkill: SkillDefinition = {
  id: "my_skill",
  name: "My Skill",
  description: "Describe what this skill does clearly — the planner AI reads this",
  parameters: {
    inputParam: {
      type: "string",
      description: "What this parameter is for",
      required: true,
    },
  },
  // For workflow skills:
  nextState: "COMPLETED",
  impliedIntent: "NEWSLETTER",
  // For generative skills:
  generative: true,
  generativeSystemPrompt: "System prompt for the AI generation step...",
}
```

### 2. Register the Skill

Add it to `SKILLS_REGISTRY` in the same file:

```typescript
export const SKILLS_REGISTRY: Record<string, SkillDefinition> = {
  // ... existing skills
  my_skill: mySkill,
}
```

### 3. Assign to an Agent

In `lib/ai/agents/profiles.ts`, add the skill ID to the appropriate agent's `skills` array:

```typescript
creative_designer: {
  // ...
  skills: [
    // ... existing skills
    "my_skill",
  ],
}
```

### 4. Add Tool Execution (Workflow Skills Only)

If the skill changes workflow state, add a handler in `lib/ai/tools.ts`:

```typescript
if (tool === "my_skill") {
  // Execute the skill logic
  return { text: "result" }
}
```

### 5. Register as a ToolName (Workflow Skills Only)

Add to the `ToolName` union in `lib/ai/types.ts`:

```typescript
export type ToolName =
  | "ask_campaign_type"
  // ... existing tools
  | "my_skill"
```

And add to `normalizeTool()` in `lib/ai/orchestrator.ts`:

```typescript
if (candidate === "my_skill") return "my_skill"
```

## Writing Effective Generative System Prompts

The `generativeSystemPrompt` is critical for generative skills. Follow these guidelines:

1. **Be specific about output format** — Always specify the exact JSON schema expected
2. **Include technical requirements** — For HTML: inline styles, table layout, max width, etc.
3. **List supported variables** — For HBS templates: list all `{{variable}}` names
4. **Set quality standards** — Responsive design, email client compatibility, accessibility
5. **Provide examples** — Show the expected output structure

Example for an HBS template skill:

```typescript
generativeSystemPrompt: [
  "You are an expert HBS email template developer.",
  "Output ONLY valid JSON: {\"subject\":\"{{subject}}\",\"html\":\"<full HBS template>\"}",
  "",
  "Requirements:",
  "- Use {{variableName}} for dynamic content",
  "- Use {{#if var}}...{{/if}} for conditionals",
  "- Use {{#each items}}...{{/each}} for iteration",
  "- Inline styles only, table-based layout, max 600px",
  "- Include {{unsubscribeUrl}} in footer",
].join("\n")
```

## Writing Effective Agent Intent Keywords

Keywords determine how the router matches user prompts to agents. Guidelines:

- **Single words** score 2 points per match
- **Multi-word phrases** score 3 points per match (checked against full prompt)
- Include **synonyms** and **variations** (e.g. "hbs", "handlebars", "template")
- Include **domain jargon** (e.g. "open rate", "click rate", "deliverability")
- Avoid **overly generic** words that match everything (e.g. "help", "make")

## Testing Skills

### Manual Testing

1. Start the dev server: `npm run dev`
2. Open the chat interface
3. Type a prompt that should trigger your skill
4. Verify the correct agent is routed (check server logs)
5. Verify the skill produces the expected output

### Verifying Router Behavior

You can test the router in isolation:

```typescript
import { routeToAgent } from "@/lib/ai/agents"

const result = routeToAgent("generate an hbs newsletter template", "INTENT_CAPTURE")
console.log(result)
// { agentId: "creative_designer", confidence: 0.75, reason: "..." }
```

## Current Skills Inventory

| Skill ID | Agent | Type | Description |
|----------|-------|------|-------------|
| `ask_campaign_type` | Campaign Operator | Workflow | Ask what type of email |
| `suggest_templates` | Campaign Operator, Creative Designer | Workflow | Show template suggestions |
| `select_template` | Campaign Operator, Creative Designer | Workflow | Select a template |
| `request_recipients` | Campaign Operator | Workflow | Ask for recipient list |
| `validate_recipients` | Campaign Operator | Workflow | Validate email addresses |
| `review_campaign` | Campaign Operator | Workflow | Show campaign summary |
| `confirm_queue_campaign` | Campaign Operator | Workflow | Queue for sending |
| `compose_simple_email` | Creative Designer | Generative | Generate HTML email |
| `compose_signature_email` | Creative Designer | Generative | Generate email signature |
| `generate_hbs_template` | Creative Designer | Generative | Generate HBS template |
| `refine_copy` | Creative Designer | Generative | Improve email copy |
| `generate_subject_lines` | Creative Designer | Generative | Generate subject lines |
| `analyze_audience` | Signals Analyst | Advisory | Audience analysis |
| `suggest_segments` | Signals Analyst | Advisory | Segment recommendations |
| `benchmark_performance` | Signals Analyst | Advisory | Industry benchmarks |
| `recommend_send_time` | Signals Analyst | Advisory | Optimal send times |
| `analyze_subject_lines` | Signals Analyst | Advisory | Subject line analysis |
| `estimate_campaign_cost` | Budget Strategist | Advisory | Cost estimation |
| `forecast_roi` | Budget Strategist | Advisory | ROI forecasting |
| `recommend_smtp_plan` | Budget Strategist | Advisory | SMTP plan advice |
| `analyze_send_volume` | Budget Strategist | Advisory | Volume optimization |
