# Blastermailer AI Architecture

## Overview

The AI orchestration system uses a **multi-agent architecture** where specialized agent profiles are dynamically routed based on user intent. Each agent has domain expertise, a unique persona, and a set of executable skills.

```
User Prompt
    │
    ▼
┌─────────────┐
│  Moderator   │  ← Content safety + prompt sanitization
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Router     │  ← Keyword scoring + workflow state affinity
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│          Agent Profiles                  │
│  ┌───────────┐  ┌──────────────────┐    │
│  │  Signals   │  │ Creative Designer│    │
│  │  Analyst   │  │                  │    │
│  └───────────┘  └──────────────────┘    │
│  ┌───────────┐  ┌──────────────────┐    │
│  │  Budget    │  │    Campaign      │    │
│  │ Strategist │  │    Operator      │    │
│  └───────────┘  └──────────────────┘    │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│          Skills Registry                 │
│  compose_simple_email                    │
│  compose_signature_email                 │
│  generate_hbs_template                   │
│  suggest_templates                       │
│  validate_recipients                     │
│  analyze_audience                        │
│  estimate_campaign_cost                  │
│  ... (21 skills total)                   │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│          Orchestrator                    │
│  1. Route to agent                       │
│  2. Run planner AI (agent persona)       │
│  3. Execute selected skill               │
│  4. Run generative step (if needed)      │
│  5. Stream conversational response       │
│  6. Persist state + telemetry            │
└─────────────────────────────────────────┘
```

## Agent Profiles

### 1. Signals Analyst (`signals_analyst`)
- **Domain**: Market research, audience signals, data-driven insights
- **Skills**: `analyze_audience`, `suggest_segments`, `benchmark_performance`, `recommend_send_time`, `analyze_subject_lines`
- **Temperature bias**: 0.3 (precise, data-focused)
- **Triggered by**: "research", "analyze", "audience", "segment", "metrics", "performance", "a/b test", etc.

### 2. Creative Designer (`creative_designer`)
- **Domain**: Email design, HTML/HBS templates, copywriting, visual branding
- **Skills**: `compose_simple_email`, `compose_signature_email`, `generate_hbs_template`, `suggest_templates`, `refine_copy`, `generate_subject_lines`, `select_template`
- **Temperature bias**: 0.7 (creative, varied output)
- **Triggered by**: "design", "template", "hbs", "write", "draft", "compose", "brand", "colors", etc.

### 3. Budget Strategist (`budget_strategist`)
- **Domain**: Campaign budgeting, ROI forecasting, send cost optimization
- **Skills**: `estimate_campaign_cost`, `forecast_roi`, `recommend_smtp_plan`, `analyze_send_volume`
- **Temperature bias**: 0.3 (precise, financial)
- **Triggered by**: "budget", "cost", "roi", "pricing", "smtp", "volume", "scale", etc.

### 4. Campaign Operator (`campaign_operator`)
- **Domain**: Campaign execution, recipient management, sending, scheduling
- **Skills**: `ask_campaign_type`, `suggest_templates`, `select_template`, `request_recipients`, `validate_recipients`, `review_campaign`, `confirm_queue_campaign`
- **Temperature bias**: 0.4 (methodical, step-by-step)
- **Triggered by**: "send", "schedule", "campaign", "recipients", "csv", "validate", "queue", etc.

## Routing Strategy

The router uses a 3-tier strategy:

1. **Workflow state affinity** — If the user is mid-workflow (e.g. `AUDIENCE_COLLECTION`), the router keeps the appropriate agent active regardless of prompt keywords.

2. **Keyword scoring** — Each agent's `intentKeywords` are matched against the user's prompt tokens. Multi-word keywords score 3 points, single-word keywords score 2 points. The agent with the highest score wins if it has ≥4 points or a ≥2 point lead.

3. **Fallback** — If no strong match, defaults to `creative_designer` (widest coverage).

## Skills System

Skills are atomic capabilities. Each skill defines:
- **Parameters** — What arguments it accepts
- **State transition** — What workflow state it moves to
- **Implied intent** — What intent it sets
- **Generative flag** — Whether it triggers an AI generation step (HTML/HBS output)
- **Generative system prompt** — The specialized prompt for the generation step

### Generative Skills
These skills produce HTML/HBS output via a dedicated AI call:
- `compose_simple_email` — One-off HTML email
- `compose_signature_email` — Professional email signature
- `generate_hbs_template` — Reusable Handlebars template with dynamic variables

### Workflow Skills
These skills manage the campaign workflow state machine:
- `ask_campaign_type` → `GOAL_BRIEF`
- `suggest_templates` → `TEMPLATE_DISCOVERY`
- `select_template` → `TEMPLATE_SELECTED`
- `request_recipients` → `AUDIENCE_COLLECTION`
- `validate_recipients` → `VALIDATION_REVIEW`
- `review_campaign` → `SEND_CONFIRMATION`
- `confirm_queue_campaign` → `QUEUED`

### Advisory Skills
These skills provide analysis and recommendations (generative, no state change):
- `analyze_audience`, `suggest_segments`, `benchmark_performance`
- `recommend_send_time`, `analyze_subject_lines`
- `estimate_campaign_cost`, `forecast_roi`, `recommend_smtp_plan`
- `refine_copy`, `generate_subject_lines`

## File Structure

```
lib/ai/
├── agents/
│   ├── index.ts          # Barrel exports
│   ├── profiles.ts       # Agent profile definitions
│   ├── router.ts         # Intent → agent routing logic
│   └── skills.ts         # Skills registry with all skill definitions
├── orchestrator.ts       # Main orchestration loop (uses agents)
├── tools.ts              # Tool execution (state-changing operations)
├── types.ts              # Shared types (ToolName, AiStreamEvent, etc.)
├── workflow-machine.ts   # Workflow state machine
├── workflow-store.ts     # Persistence layer
├── credits.ts            # Credit/quota management
├── moderation.ts         # Content moderation
├── model-mode.ts         # Model quality mode resolution
└── model-registry.ts     # Available AI models
```

## Adding a New Skill

1. Define the skill in `lib/ai/agents/skills.ts`:
   ```ts
   const myNewSkill: SkillDefinition = {
     id: "my_new_skill",
     name: "My New Skill",
     description: "What this skill does",
     parameters: { ... },
     nextState: "COMPLETED",  // optional
     generative: true,        // if it produces AI output
     generativeSystemPrompt: "...",  // for generative skills
   }
   ```

2. Add it to `SKILLS_REGISTRY` in the same file.

3. Add the skill ID to the appropriate agent's `skills` array in `profiles.ts`.

4. If it's a workflow skill (changes state), add a handler in `tools.ts`.

5. If it's a new `ToolName`, add it to the union type in `types.ts` and to `normalizeTool()` in `orchestrator.ts`.

## Adding a New Agent

1. Define the agent in `lib/ai/agents/profiles.ts`:
   ```ts
   my_agent: {
     id: "my_agent",
     name: "My Agent",
     shortDescription: "...",
     intentKeywords: [...],
     systemPrompt: "...",
     skills: [...],
     temperatureBias: 0.5,
   }
   ```

2. Add the ID to the `AgentId` union type.

3. Optionally add state affinity rules in `router.ts` → `STATE_AFFINITY`.
