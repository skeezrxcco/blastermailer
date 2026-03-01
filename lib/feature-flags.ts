const envCampaigns = process.env.NEXT_PUBLIC_ENABLE_CAMPAIGNS_PAGE
const envTemplates = process.env.NEXT_PUBLIC_ENABLE_TEMPLATES_PAGE

export const featureFlags = {
  campaignsPage: envCampaigns === "1" || envCampaigns === "true",
  templatesPage: envTemplates === "1" || envTemplates === "true",
} as const
