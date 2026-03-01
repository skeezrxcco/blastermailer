/**
 * Skills Registry — each skill is an atomic capability that an agent can invoke.
 *
 * Skills define:
 * - What they do (description for the planner prompt)
 * - What arguments they accept
 * - What state transitions they trigger
 * - An optional system prompt override for generation tasks
 */

import type { AiWorkflowIntent, AiWorkflowState } from "@/lib/ai/types"

export type SkillId = string

export type SkillDefinition = {
  id: SkillId
  name: string
  description: string
  /** Arguments the skill accepts (for the planner JSON schema) */
  parameters: Record<string, { type: string; description: string; required?: boolean }>
  /** The workflow state this skill transitions to */
  nextState?: AiWorkflowState
  /** The intent this skill implies */
  impliedIntent?: AiWorkflowIntent
  /** If true, this skill triggers an AI generation step (e.g. HTML email, HBS template) */
  generative?: boolean
  /** System prompt for the generative step */
  generativeSystemPrompt?: string
}

// ---------------------------------------------------------------------------
// Campaign workflow skills
// ---------------------------------------------------------------------------

const askCampaignType: SkillDefinition = {
  id: "ask_campaign_type",
  name: "Ask Campaign Type",
  description: "Ask the user what type of email they want to create (newsletter, simple email, signature, etc.)",
  parameters: {},
  nextState: "GOAL_BRIEF",
}

const suggestTemplates: SkillDefinition = {
  id: "suggest_templates",
  name: "Suggest Templates",
  description: "Show template suggestions based on the user's goal or query",
  parameters: {
    query: { type: "string", description: "Search query to match templates", required: true },
  },
  nextState: "TEMPLATE_DISCOVERY",
  impliedIntent: "NEWSLETTER",
}

const selectTemplate: SkillDefinition = {
  id: "select_template",
  name: "Select Template",
  description: "Select a specific template by ID",
  parameters: {
    templateId: { type: "string", description: "The template ID to select", required: true },
  },
  nextState: "TEMPLATE_SELECTED",
}

const requestRecipients: SkillDefinition = {
  id: "request_recipients",
  name: "Request Recipients",
  description: "Ask the user to provide their recipient list (CSV upload or paste emails)",
  parameters: {},
  nextState: "AUDIENCE_COLLECTION",
}

const validateRecipients: SkillDefinition = {
  id: "validate_recipients",
  name: "Validate Recipients",
  description: "Validate a list of email addresses for format, duplicates, and deliverability",
  parameters: {
    recipients: { type: "string", description: "Raw email addresses to validate", required: true },
  },
  nextState: "VALIDATION_REVIEW",
}

const reviewCampaign: SkillDefinition = {
  id: "review_campaign",
  name: "Review Campaign",
  description: "Show a campaign summary for the user to review before sending",
  parameters: {},
  nextState: "SEND_CONFIRMATION",
}

const confirmQueueCampaign: SkillDefinition = {
  id: "confirm_queue_campaign",
  name: "Confirm & Queue Campaign",
  description: "Queue the campaign for sending after user confirmation",
  parameters: {},
  nextState: "QUEUED",
}

// ---------------------------------------------------------------------------
// Email composition skills
// ---------------------------------------------------------------------------

const composeSimpleEmail: SkillDefinition = {
  id: "compose_simple_email",
  name: "Compose Simple Email",
  description: "Generate content variables for a one-off email rendered through a fixed HBS layout",
  parameters: {
    subject: { type: "string", description: "Email subject line" },
    tone: { type: "string", description: "Desired tone (professional, casual, friendly, urgent)" },
    recipient: { type: "string", description: "Who the email is for" },
    purpose: { type: "string", description: "What the email should accomplish" },
  },
  nextState: "COMPLETED",
  impliedIntent: "SIMPLE_EMAIL",
  generative: true,
  generativeSystemPrompt: [
    "You write premium email content fields for a fixed HBS template.",
    "Do NOT generate HTML.",
    "Return JSON only with: subject,title,subtitle,content,cta,image,footer.",
    "Use a clear hierarchy: concise subject, strong title, one-line subtitle, 2-4 short paragraphs, and a concrete CTA.",
    "image must be a direct HTTPS hero image URL.",
  ].join("\n"),
}

const composeSignatureEmail: SkillDefinition = {
  id: "compose_signature_email",
  name: "Compose Signature Email",
  description: "Generate signature-oriented content fields for a fixed HBS layout",
  parameters: {
    name: { type: "string", description: "Person's full name" },
    title: { type: "string", description: "Job title" },
    company: { type: "string", description: "Company name" },
    colors: { type: "string", description: "Brand colors to use" },
  },
  nextState: "COMPLETED",
  impliedIntent: "SIGNATURE",
  generative: true,
  generativeSystemPrompt: [
    "You write signature-oriented content fields for a fixed HBS template.",
    "Do NOT generate HTML.",
    "Return JSON only with: subject,title,subtitle,content,cta,image,footer.",
    "Keep the language polished, concise, and professional.",
    "image must be a direct HTTPS image URL.",
  ].join("\n"),
}

// ---------------------------------------------------------------------------
// HBS template generation skill
// ---------------------------------------------------------------------------

const generateHbsTemplate: SkillDefinition = {
  id: "generate_hbs_template",
  name: "Generate HBS Template",
  description: "Select an HBS base template and generate dynamic content fields for it",
  parameters: {
    templateType: { type: "string", description: "Type of template (newsletter, welcome, promo, announcement, etc.)" },
    variables: { type: "string", description: "Comma-separated list of dynamic variables to include (e.g. firstName, companyName, ctaUrl)" },
    style: { type: "string", description: "Visual style description (modern, minimal, bold, corporate, etc.)" },
    sections: { type: "string", description: "Sections to include (hero, body, features, cta, footer, etc.)" },
  },
  nextState: "CONTENT_REFINE",
  impliedIntent: "NEWSLETTER",
  generative: true,
  generativeSystemPrompt: [
    "You produce high-quality content fields for a reusable HBS newsletter template.",
    "Do NOT generate HTML.",
    "Return JSON only with: subject,title,subtitle,content,cta,image,footer.",
    "Optional keys: preheader,templateName,accentColor,backgroundColor,buttonColor,buttonTextColor.",
    "Apply modern newsletter best practices: dark-mode friendly palette choices, strong visual hierarchy in copy, and conversion-driven CTA language.",
    "image must be a direct HTTPS hero image URL that is publicly reachable.",
  ].join("\n"),
}

// ---------------------------------------------------------------------------
// Creative & copy skills
// ---------------------------------------------------------------------------

const refineCopy: SkillDefinition = {
  id: "refine_copy",
  name: "Refine Copy",
  description: "Improve or rewrite email copy (subject lines, body text, CTAs) for better engagement",
  parameters: {
    content: { type: "string", description: "The copy to refine" },
    goal: { type: "string", description: "What improvement is needed (more engaging, shorter, different tone, etc.)" },
  },
  generative: true,
  generativeSystemPrompt: [
    "You are an expert email copywriter. Refine the given copy to be more engaging and effective.",
    "Output ONLY the improved copy text. No explanation, no markdown.",
  ].join("\n"),
}

const generateSubjectLines: SkillDefinition = {
  id: "generate_subject_lines",
  name: "Generate Subject Lines",
  description: "Generate multiple subject line options for an email campaign",
  parameters: {
    topic: { type: "string", description: "What the email is about" },
    tone: { type: "string", description: "Desired tone" },
    count: { type: "string", description: "How many options to generate (default: 5)" },
  },
  generative: true,
  generativeSystemPrompt: [
    "You are an expert email subject line writer. Generate compelling subject lines.",
    "Output a numbered list of subject lines. Each should be under 60 characters.",
    "Vary the approach: curiosity, urgency, benefit-driven, question, personalization.",
  ].join("\n"),
}

// ---------------------------------------------------------------------------
// Signals & analytics skills
// ---------------------------------------------------------------------------

const analyzeAudience: SkillDefinition = {
  id: "analyze_audience",
  name: "Analyze Audience",
  description: "Analyze an audience list and provide segmentation recommendations",
  parameters: {
    audienceDescription: { type: "string", description: "Description of the audience or data available" },
  },
  generative: true,
  generativeSystemPrompt: [
    "You are an email marketing audience analyst. Provide actionable segmentation recommendations.",
    "Consider demographics, behavior, engagement level, and purchase history.",
  ].join("\n"),
}

const suggestSegments: SkillDefinition = {
  id: "suggest_segments",
  name: "Suggest Segments",
  description: "Suggest audience segments for targeted email campaigns",
  parameters: {
    businessType: { type: "string", description: "Type of business" },
    goal: { type: "string", description: "Campaign goal" },
  },
  generative: true,
}

const benchmarkPerformance: SkillDefinition = {
  id: "benchmark_performance",
  name: "Benchmark Performance",
  description: "Provide industry benchmark data for email marketing metrics",
  parameters: {
    industry: { type: "string", description: "Industry vertical" },
    metric: { type: "string", description: "Specific metric to benchmark (open rate, CTR, etc.)" },
  },
  generative: true,
}

const recommendSendTime: SkillDefinition = {
  id: "recommend_send_time",
  name: "Recommend Send Time",
  description: "Recommend optimal send times based on audience and campaign type",
  parameters: {
    audienceType: { type: "string", description: "B2B, B2C, or mixed" },
    timezone: { type: "string", description: "Primary audience timezone" },
  },
  generative: true,
}

const analyzeSubjectLines: SkillDefinition = {
  id: "analyze_subject_lines",
  name: "Analyze Subject Lines",
  description: "Analyze subject lines for effectiveness and suggest improvements",
  parameters: {
    subjectLines: { type: "string", description: "Subject lines to analyze (one per line)" },
  },
  generative: true,
}

// ---------------------------------------------------------------------------
// Budget & strategy skills
// ---------------------------------------------------------------------------

const estimateCampaignCost: SkillDefinition = {
  id: "estimate_campaign_cost",
  name: "Estimate Campaign Cost",
  description: "Estimate the cost of sending a campaign based on volume and infrastructure",
  parameters: {
    recipientCount: { type: "string", description: "Number of recipients" },
    frequency: { type: "string", description: "How often (one-time, weekly, monthly)" },
  },
  generative: true,
}

const forecastRoi: SkillDefinition = {
  id: "forecast_roi",
  name: "Forecast ROI",
  description: "Forecast the return on investment for an email campaign",
  parameters: {
    recipientCount: { type: "string", description: "Audience size" },
    averageOrderValue: { type: "string", description: "Average order value" },
    conversionRate: { type: "string", description: "Expected conversion rate" },
  },
  generative: true,
}

const recommendSmtpPlan: SkillDefinition = {
  id: "recommend_smtp_plan",
  name: "Recommend SMTP Plan",
  description: "Recommend the best SMTP/sending infrastructure based on volume and budget",
  parameters: {
    monthlyVolume: { type: "string", description: "Expected monthly send volume" },
    budget: { type: "string", description: "Monthly budget for sending infrastructure" },
  },
  generative: true,
}

const analyzeSendVolume: SkillDefinition = {
  id: "analyze_send_volume",
  name: "Analyze Send Volume",
  description: "Analyze sending patterns and recommend volume optimization",
  parameters: {
    currentVolume: { type: "string", description: "Current monthly send volume" },
    growthTarget: { type: "string", description: "Target growth rate" },
  },
  generative: true,
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const SKILLS_REGISTRY: Record<string, SkillDefinition> = {
  ask_campaign_type: askCampaignType,
  suggest_templates: suggestTemplates,
  select_template: selectTemplate,
  request_recipients: requestRecipients,
  validate_recipients: validateRecipients,
  review_campaign: reviewCampaign,
  confirm_queue_campaign: confirmQueueCampaign,
  compose_simple_email: composeSimpleEmail,
  compose_signature_email: composeSignatureEmail,
  generate_hbs_template: generateHbsTemplate,
  refine_copy: refineCopy,
  generate_subject_lines: generateSubjectLines,
  analyze_audience: analyzeAudience,
  suggest_segments: suggestSegments,
  benchmark_performance: benchmarkPerformance,
  recommend_send_time: recommendSendTime,
  analyze_subject_lines: analyzeSubjectLines,
  estimate_campaign_cost: estimateCampaignCost,
  forecast_roi: forecastRoi,
  recommend_smtp_plan: recommendSmtpPlan,
  analyze_send_volume: analyzeSendVolume,
}

export function getSkill(id: string): SkillDefinition | undefined {
  return SKILLS_REGISTRY[id]
}

export function getSkillsForAgent(skillIds: string[]): SkillDefinition[] {
  return skillIds.map((id) => SKILLS_REGISTRY[id]).filter(Boolean)
}

export function buildSkillsDescription(skillIds: string[]): string {
  return getSkillsForAgent(skillIds)
    .map((s) => `- ${s.id}: ${s.description}`)
    .join("\n")
}
