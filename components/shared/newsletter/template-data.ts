export type TemplateOption = {
  id: string
  name: string
  theme: string
  description: string
  audience: string
  tone: string
  accentA: string
  accentB: string
  surface: string
  ctaBg: string
  ctaText: string
  heroImage: string
  dishOneImage: string
  dishTwoImage: string
}

export type TemplateEditorData = {
  restaurantName: string
  subjectLine: string
  preheader: string
  headline: string
  subheadline: string
  ctaText: string
  heroImage: string
  offerTitle: string
  offerDescription: string
  dishOneTitle: string
  dishOneDescription: string
  dishTwoTitle: string
  dishTwoDescription: string
  footerNote: string
}

export const templateOptions: TemplateOption[] = [
  {
    id: "sushi-omakase-signature",
    name: "Sushi Omakase Signature",
    theme: "Sushi",
    description: "Clean Japanese editorial design with omakase storytelling, premium pairings, and reservation urgency.",
    audience: "Urban gourmets",
    tone: "Refined + calm",
    accentA: "#0f172a",
    accentB: "#14b8a6",
    surface: "#ecfeff",
    ctaBg: "#0f172a",
    ctaText: "#ecfeff",
    heroImage: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=1600&q=80",
    dishOneImage: "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=900&q=80",
    dishTwoImage: "https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "burger-street-social",
    name: "Burger Street Social",
    theme: "Burger place",
    description: "Bold conversion-focused layout with social proof, combo offer blocks, and high-energy visuals.",
    audience: "Lunch + dinner crowd",
    tone: "Bold + playful",
    accentA: "#7c2d12",
    accentB: "#f97316",
    surface: "#fff7ed",
    ctaBg: "#7c2d12",
    ctaText: "#fff7ed",
    heroImage: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1600&q=80",
    dishOneImage: "https://images.unsplash.com/photo-1550317138-10000687a72b?auto=format&fit=crop&w=900&q=80",
    dishTwoImage: "https://images.unsplash.com/photo-1549611016-3a70d82b5040?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "vegan-garden-journal",
    name: "Vegan Garden Journal",
    theme: "Vegan",
    description: "Fresh botanical aesthetic with nutrient-forward copy, colorful bowls, and wellness-centered messaging.",
    audience: "Health-focused subscribers",
    tone: "Fresh + uplifting",
    accentA: "#14532d",
    accentB: "#22c55e",
    surface: "#f0fdf4",
    ctaBg: "#14532d",
    ctaText: "#f0fdf4",
    heroImage: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1600&q=80",
    dishOneImage: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80",
    dishTwoImage: "https://images.unsplash.com/photo-1543353071-10c8ba85a904?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "fine-cuisine-grand-soiree",
    name: "Fine Cuisine Grand Soiree",
    theme: "Fine cuisine",
    description: "Luxury editorial template with chef narrative, plated-course highlights, and elevated visual hierarchy.",
    audience: "VIP and special occasions",
    tone: "Elegant + exclusive",
    accentA: "#1f2937",
    accentB: "#a16207",
    surface: "#fefce8",
    ctaBg: "#111827",
    ctaText: "#fefce8",
    heroImage: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1600&q=80",
    dishOneImage: "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?auto=format&fit=crop&w=900&q=80",
    dishTwoImage: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=900&q=80",
  },
]

function toTitleCase(input: string) {
  return input
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(" ")
}

export function buildEditorData(prompt: string, template: TemplateOption): TemplateEditorData {
  const cleanedPrompt = prompt ? toTitleCase(prompt.replace(/^newsletter for\s*/i, "")) : ""

  if (template.id === "sushi-omakase-signature") {
    const restaurantName = cleanedPrompt || "Sakura Omakase Atelier"
    return {
      restaurantName,
      subjectLine: `${restaurantName} | New Omakase Experience`,
      preheader: "18-seat omakase counter, seasonal fish arrivals, and sake pairing flights.",
      headline: "Tonight's Omakase Is Now Open",
      subheadline:
        "Our chef presents a 14-course progression with line-caught fish, premium rice, and a new curated sake pairing for a limited number of guests.",
      ctaText: "Reserve Omakase Seats",
      heroImage: template.heroImage,
      offerTitle: "Seasonal tasting spotlight",
      offerDescription:
        "Reserve before Thursday and enjoy a complimentary opening course featuring toro and yuzu ponzu.",
      dishOneTitle: "Otoro Nigiri",
      dishOneDescription: "Bluefin otoro with aged soy and fresh wasabi shaved tableside.",
      dishTwoTitle: "Hokkaido Uni Bowl",
      dishTwoDescription: "Hokkaido uni, ikura pearls, and warm sushi rice with citrus zest.",
      footerNote: `You're receiving this from ${restaurantName}. Dietary requests are welcome with your booking.`,
    }
  }

  if (template.id === "burger-street-social") {
    const restaurantName = cleanedPrompt || "Flame House Burgers"
    return {
      restaurantName,
      subjectLine: `${restaurantName} | Smash Combo Week`,
      preheader: "Double smash stacks, truffle fries, and one-week-only combo pricing.",
      headline: "Big Flavor. Fast Pickup.",
      subheadline:
        "Our best-selling burger lineup is back with loaded sides, house sauces, and 20-minute pickup windows across peak dinner hours.",
      ctaText: "Claim Combo Offer",
      heroImage: template.heroImage,
      offerTitle: "Street combo spotlight",
      offerDescription:
        "Order before 8:00 PM and get a free signature milkshake on every double-smash combo.",
      dishOneTitle: "Double Smash Deluxe",
      dishOneDescription: "Two aged-beef patties, smoked cheddar, pickles, and flame sauce.",
      dishTwoTitle: "Crispy Chicken Stack",
      dishTwoDescription: "Buttermilk chicken, slaw, and chili honey on a toasted brioche bun.",
      footerNote: `You're receiving this from ${restaurantName}. Manage your preferences anytime from your account settings.`,
    }
  }

  if (template.id === "vegan-garden-journal") {
    const restaurantName = cleanedPrompt || "Verdant Table Kitchen"
    return {
      restaurantName,
      subjectLine: `${restaurantName} | Fresh Seasonal Bowls`,
      preheader: "Plant-forward seasonal plates, vibrant bowls, and chef-crafted wellness options.",
      headline: "Fresh, Colorful, Fully Plant-Based",
      subheadline:
        "This week's menu balances bold protein bowls, cold-pressed pairings, and rich sauces crafted from peak seasonal produce.",
      ctaText: "Book A Table",
      heroImage: template.heroImage,
      offerTitle: "Wellness tasting menu",
      offerDescription:
        "Reserve by Friday and enjoy a complimentary adaptogen tonic with any dinner tasting set.",
      dishOneTitle: "Green Goddess Bowl",
      dishOneDescription: "Quinoa, roasted broccoli, avocado, pistachio crunch, and herb dressing.",
      dishTwoTitle: "Smoked Carrot Tartare",
      dishTwoDescription: "Smoked carrots, capers, rye crisps, and lemon-cashew cream.",
      footerNote: `You're receiving this from ${restaurantName}. Preferences and dietary notes can be updated in your profile.`,
    }
  }

  const restaurantName = cleanedPrompt || "Maison Ciel"
  return {
    restaurantName,
    subjectLine: `${restaurantName} | Grand Chef's Table`,
    preheader: "A five-course luxury tasting with curated wine pairing and limited reservations.",
    headline: "An Evening of Fine Culinary Craft",
    subheadline:
      "Experience our new chef's table menu featuring refined French techniques, rare ingredients, and an elegant pacing from amuse-bouche to dessert.",
    ctaText: "Request Your Table",
    heroImage: template.heroImage,
    offerTitle: "Chef's grand degustation",
    offerDescription: "Reserve your table before Sunday to receive an exclusive sommelier pairing upgrade.",
    dishOneTitle: "Truffle Celeriac Veloute",
    dishOneDescription: "Silky celeriac veloute with black truffle shavings and hazelnut oil.",
    dishTwoTitle: "Butter-Poached Lobster",
    dishTwoDescription: "Atlantic lobster with saffron beurre blanc and charred leeks.",
    footerNote: `You're receiving this from ${restaurantName}. Concierge support is available for private dining requests.`,
  }
}
