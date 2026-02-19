import type { CheckoutItem } from "@/hooks/use-checkout-item"

export type PricingPlan = {
  name: string
  monthly: number
  annual: number
  description: string
  features: string[]
  highlighted?: boolean
}

export const pricingPlans: PricingPlan[] = [
  {
    name: "Starter",
    monthly: 19,
    annual: 15,
    description: "For small teams shipping consistently.",
    features: ["2,000 contacts", "Basic templates", "Email support", "1 workspace"],
  },
  {
    name: "Growth",
    monthly: 79,
    annual: 63,
    description: "Best for growing hospitality brands.",
    features: ["20,000 contacts", "Advanced templates", "Priority support", "3 workspaces"],
    highlighted: true,
  },
  {
    name: "Scale",
    monthly: 199,
    annual: 159,
    description: "High-volume automation and dedicated support.",
    features: ["100,000 contacts", "Custom branding", "Dedicated manager", "SLA + SSO"],
  },
]

export const pricingAddOns: CheckoutItem[] = [
  {
    id: "emails-10k",
    kind: "emails",
    name: "10,000 extra emails",
    description: "One-time send boost for launch or seasonal campaigns.",
    price: 39,
    billing: "one-time",
  },
  {
    id: "smtp-addon",
    kind: "smtp",
    name: "Custom SMTP add-on",
    description: "Use your own SMTP relay with dedicated sender reputation controls.",
    price: 29,
    billing: "monthly",
  },
]
