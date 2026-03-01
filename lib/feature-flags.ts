const envCampaigns = process.env.NEXT_PUBLIC_ENABLE_CAMPAIGNS_PAGE

export const featureFlags = {
  campaignsPage: envCampaigns === "1" || envCampaigns === "true",
} as const

