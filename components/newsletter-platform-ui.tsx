"use client"

import { type ComponentType, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { CardSpotlight } from "@/components/ui/card-spotlight"
import { GlowingEffect } from "@/components/ui/glowing-effect"
import { ArrowRightIcon } from "@/components/ui/arrow-right"
import { BotIcon } from "@/components/ui/bot"
import { ChevronLeftIcon } from "@/components/ui/chevron-left"
import { CircleCheckIcon } from "@/components/ui/circle-check"
import { CogIcon } from "@/components/ui/cog"
import { EyeIcon } from "@/components/ui/eye"
import { FilePenLineIcon } from "@/components/ui/file-pen-line"
import { FileTextIcon } from "@/components/ui/file-text"
import { HandCoinsIcon } from "@/components/ui/hand-coins"
import { IdCardIcon } from "@/components/ui/id-card"
import { LayoutPanelTopIcon } from "@/components/ui/layout-panel-top"
import { LoaderPinwheelIcon } from "@/components/ui/loader-pinwheel"
import { LockIcon } from "@/components/ui/lock"
import { MenuIcon } from "@/components/ui/menu"
import { MonitorCheckIcon } from "@/components/ui/monitor-check"
import { PanelLeftCloseIcon } from "@/components/ui/panel-left-close"
import { PanelLeftOpenIcon } from "@/components/ui/panel-left-open"
import { PartyPopperIcon } from "@/components/ui/party-popper"
import { RocketIcon } from "@/components/ui/rocket"
import { ShieldCheckIcon } from "@/components/ui/shield-check"
import { SmartphoneChargingIcon } from "@/components/ui/smartphone-charging"
import { SparklesIcon } from "@/components/ui/sparkles"
import { UsersIcon } from "@/components/ui/users"
import { XIcon } from "@/components/ui/x"
import { cn } from "@/lib/utils"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

type Phase = "initial" | "templates" | "emails" | "validation" | "reviewTemplate" | "confirm" | "sent"
type SidebarTab = "chat" | "templates" | "contacts" | "sent" | "settings" | "pricing" | "checkout"
type PreviewMode = "mobile" | "tablet" | "desktop"
type MessageKind = "text" | "templates" | "validation" | "templateReview" | "confirm" | "sent"
type EditorTarget = "headline" | "subheadline" | "ctaText" | "offerTitle"
type EditableTemplateField = keyof TemplateEditorData
type SettingsSection = "profile" | "plan" | "usage" | "referals"
type AppIcon = ComponentType<{ className?: string; size?: number }>
type IconAnimationHandle = { startAnimation: () => void; stopAnimation: () => void }
type NavigationItem = { id: string; label: string; icon: AppIcon; active: boolean; onSelect: () => void }

type ChatMessage = {
  id: number
  role: "bot" | "user"
  kind: MessageKind
  text?: string
}

type EditorChatMessage = {
  id: number
  role: "assistant" | "user"
  text: string
}

type ValidationStats = {
  total: number
  valid: number
  invalid: number
  duplicates: number
}

type SendSummary = {
  campaignName: string
  templateName: string
  audienceCount: number
  sentAt: string
  openRate: string
  clickRate: string
  bounceRate: string
}

type TemplateOption = {
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

type TemplateEditorData = {
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

const viewportSpecs: Record<PreviewMode, { label: string; width: number; height: number }> = {
  desktop: { label: "Desktop", width: 1280, height: 900 },
  tablet: { label: "Tablet", width: 834, height: 1112 },
  mobile: { label: "Mobile", width: 390, height: 844 },
}

const templateOptions: TemplateOption[] = [
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

const sidebarItems: { id: SidebarTab; label: string; icon: AppIcon }[] = [
  { id: "chat", label: "Chat", icon: BotIcon },
  { id: "templates", label: "Templates", icon: FileTextIcon },
  { id: "contacts", label: "Contacts", icon: UsersIcon },
  { id: "sent", label: "Sent", icon: RocketIcon },
]

const settingsSidebarItems: { id: SettingsSection | "pricing" | "checkout"; label: string; icon: AppIcon }[] = [
  { id: "profile", label: "Profile", icon: UsersIcon },
  { id: "plan", label: "Plan", icon: CircleCheckIcon },
  { id: "usage", label: "Usage", icon: RocketIcon },
  { id: "referals", label: "Referals", icon: PartyPopperIcon },
  { id: "pricing", label: "Pricing", icon: HandCoinsIcon },
  { id: "checkout", label: "Checkout", icon: IdCardIcon },
]

const usageTimeline = [
  { label: "Mon", sends: 640, opens: 322 },
  { label: "Tue", sends: 720, opens: 381 },
  { label: "Wed", sends: 810, opens: 436 },
  { label: "Thu", sends: 780, opens: 401 },
  { label: "Fri", sends: 912, opens: 468 },
  { label: "Sat", sends: 688, opens: 334 },
  { label: "Sun", sends: 560, opens: 288 },
]

const usageByChannel = [
  { channel: "Campaigns", value: 58 },
  { channel: "Automations", value: 26 },
  { channel: "Referrals", value: 16 },
]

const usageChartConfig = {
  sends: { label: "Sends", color: "#60a5fa" },
  opens: { label: "Opens", color: "#34d399" },
  value: { label: "Share", color: "#f59e0b" },
}

const tabRoutes: Record<SidebarTab, string> = {
  chat: "/chat",
  templates: "/templates",
  contacts: "/contacts",
  sent: "/sent",
  settings: "/settings",
  pricing: "/pricing",
  checkout: "/checkout",
}

function HoverAnimatedIcon({
  icon: Icon,
  active,
  size,
  className,
}: {
  icon: AppIcon
  active: boolean
  size: number
  className?: string
}) {
  const iconRef = useRef<IconAnimationHandle | null>(null)

  useEffect(() => {
    if (active) {
      iconRef.current?.startAnimation()
      return
    }
    iconRef.current?.stopAnimation()
  }, [active])

  const IconComponent = Icon as unknown as ComponentType<any>

  return <IconComponent ref={iconRef} size={size} className={className} />
}

function tabFromPathname(pathname: string): SidebarTab {
  if (pathname.startsWith("/templates")) return "templates"
  if (pathname.startsWith("/contacts")) return "contacts"
  if (pathname.startsWith("/sent")) return "sent"
  if (pathname.startsWith("/settings")) return "settings"
  if (pathname.startsWith("/pricing")) return "pricing"
  if (pathname.startsWith("/checkout")) return "checkout"
  return "chat"
}

function settingsSectionFromParam(value: string | null): SettingsSection {
  if (value === "profile" || value === "plan" || value === "usage" || value === "referals") return value
  return "profile"
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function parseEmails(raw: string): ValidationStats {
  const tokens = raw
    .split(/[;\n,]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)

  const seen = new Set<string>()
  let valid = 0
  let invalid = 0
  let duplicates = 0

  for (const email of tokens) {
    if (!looksLikeEmail(email)) {
      invalid += 1
      continue
    }

    if (seen.has(email)) {
      duplicates += 1
      continue
    }

    seen.add(email)
    valid += 1
  }

  return {
    total: tokens.length,
    valid,
    invalid,
    duplicates,
  }
}

function toTitleCase(input: string) {
  return input
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(" ")
}

function buildEditorData(prompt: string, template: TemplateOption): TemplateEditorData {
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
    const restaurantName = cleanedPrompt || "Verdant Vegan Kitchen"
    return {
      restaurantName,
      subjectLine: `${restaurantName} | Fresh Seasonal Bowls`,
      preheader: "Plant-forward seasonal plates, vibrant bowls, and chef-crafted wellness options.",
      headline: "Fresh, Colorful, Fully Plant-Based",
      subheadline:
        "This week's menu balances high-protein bowls, cold-pressed add-ons, and flavor-rich sauces crafted from peak seasonal produce.",
      ctaText: "Book A Table",
      heroImage: template.heroImage,
      offerTitle: "Wellness tasting menu",
      offerDescription:
        "Reserve by Friday and enjoy a complimentary adaptogen tonic with any dinner tasting set.",
      dishOneTitle: "Green Goddess Bowl",
      dishOneDescription: "Quinoa, roasted broccoli, avocado, pistachio crunch, and herb dressing.",
      dishTwoTitle: "Smoked Carrot Tartare",
      dishTwoDescription: "Smoked carrots, capers, rye crisps, and lemon-cashew cream.",
      footerNote: `You're receiving this from ${restaurantName}. We can customize every dish for allergens on request.`,
    }
  }

  const restaurantName = cleanedPrompt || "Maison Étoile"
  return {
    restaurantName,
    subjectLine: `${restaurantName} | Grand Chef's Table`,
    preheader: "A refined six-course journey, cellar pairings, and limited evening seating.",
    headline: "An Evening of Fine Cuisine",
    subheadline:
      "Join us for a meticulously plated six-course tasting led by Chef Laurent, with optional sommelier pairings from our cellar collection.",
    ctaText: "Request Your Table",
    heroImage: template.heroImage,
    offerTitle: "Grand soiree invitation",
    offerDescription: "Confirm your booking by Thursday for a complimentary amuse-bouche and cellar welcome pour.",
    dishOneTitle: "Butter Poached Lobster",
    dishOneDescription: "Poached lobster with saffron beurre blanc, fennel, and citrus pearls.",
    dishTwoTitle: "Wagyu Tenderloin",
    dishTwoDescription: "Japanese wagyu, black truffle jus, and confit root vegetables.",
    footerNote: `You're receiving this from ${restaurantName}. Private dining and corporate tasting requests are available.`,
  }
}

export function NewsletterPlatformUI({ initialTab }: { initialTab?: SidebarTab }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const pathnameTab = tabFromPathname(pathname ?? "/chat")
  const isChatRoute = pathnameTab === "chat"
  const activeSettingsSection = settingsSectionFromParam(searchParams.get("section"))
  const nextId = useRef(5)
  const messageRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const chatScrollContainerRef = useRef<HTMLDivElement | null>(null)

  const [view, setView] = useState<"chat" | "summary">("chat")
  const [phase, setPhase] = useState<Phase>("initial")
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [composerText, setComposerText] = useState("")
  const [promptTopic, setPromptTopic] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption | null>(null)
  const [validationStats, setValidationStats] = useState<ValidationStats | null>(null)
  const [isGeneratingTemplates, setIsGeneratingTemplates] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [sidebarToggleHovered, setSidebarToggleHovered] = useState(false)
  const [topExitHovered, setTopExitHovered] = useState(false)
  const [topSettingsHovered, setTopSettingsHovered] = useState(false)
  const [credits] = useState(120)
  const maxCredits = 120
  const [sendSummary, setSendSummary] = useState<SendSummary | null>(null)
  const [templateMessageId, setTemplateMessageId] = useState<number | null>(null)

  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<TemplateOption | null>(null)
  const [previewData, setPreviewData] = useState<TemplateEditorData>(buildEditorData("Sushi", templateOptions[0]))
  const [previewViewport, setPreviewViewport] = useState<PreviewMode>("desktop")

  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editorData, setEditorData] = useState<TemplateEditorData>(buildEditorData("Sushi", templateOptions[0]))
  const [editorViewport, setEditorViewport] = useState<PreviewMode>("desktop")

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "bot",
      kind: "text",
      text: "What newsletter do you want to create?",
    },
  ])

  const composerPlaceholder = useMemo(() => {
    if (phase === "initial") return "newsletter for restaurants"
    if (phase === "emails") return "Paste emails separated by ;"
    return ""
  }, [phase])

  const addMessage = (message: Omit<ChatMessage, "id">) => {
    const id = nextId.current
    nextId.current += 1
    setMessages((prev) => [...prev, { ...message, id }])
    return id
  }

  const scrollToMessage = (id: number | null) => {
    if (!id) return
    const target = messageRefs.current[id]
    if (!target) return
    target.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const navigateToTab = (tab: SidebarTab) => {
    const href = tabRoutes[tab]
    if (pathname !== href) {
      router.push(href)
    }
  }

  const navigateToSettingsSection = (section: SettingsSection) => {
    const href = `/settings?section=${section}`
    router.push(href)
  }

  const runTemplateGeneration = (prompt: string) => {
    setIsGeneratingTemplates(true)
    setPhase("templates")

    setTimeout(() => {
      setIsGeneratingTemplates(false)
      const id = addMessage({
        role: "bot",
        kind: "templates",
        text: `Templates for "${prompt}"`,
      })
      setTemplateMessageId(id)
    }, 900)
  }

  const handleComposerSubmit = () => {
    const value = composerText.trim()
    if (!value) return

    if (phase === "initial") {
      setPromptTopic(value)
      addMessage({ role: "user", kind: "text", text: value })
      setComposerText("")
      runTemplateGeneration(value)
      return
    }

    if (phase === "emails") {
      const stats = parseEmails(value)
      setValidationStats(stats)
      addMessage({ role: "user", kind: "text", text: `Recipients: ${stats.total}` })
      setComposerText("")
      setPhase("validation")
      setIsValidating(true)

      setTimeout(() => {
        setIsValidating(false)
        addMessage({ role: "bot", kind: "validation" })
        addMessage({ role: "bot", kind: "templateReview" })
        setPhase("reviewTemplate")
      }, 1000)
    }
  }

  const handleTemplateSelect = (template: TemplateOption) => {
    const data = buildEditorData(promptTopic || template.theme, template)
    setSelectedTemplate(template)
    setEditorData(data)
    addMessage({ role: "user", kind: "text", text: `Template selected: ${template.name}` })
    addMessage({ role: "bot", kind: "text", text: "Add recipient emails." })
    setPhase("emails")
  }

  const handleChangeTemplate = () => {
    setView("chat")
    setPhase("templates")
    scrollToMessage(templateMessageId)
  }

  const handleContinueFromTemplateReview = () => {
    addMessage({ role: "bot", kind: "confirm", text: "Should I send ?" })
    setPhase("confirm")
  }

  const handleSendNow = () => {
    if (!selectedTemplate) return

    setView("chat")
    addMessage({ role: "user", kind: "text", text: "Yes, send." })
    setIsSending(true)

    setTimeout(() => {
      const summary: SendSummary = {
        campaignName: promptTopic ? `Campaign: ${promptTopic}` : "Campaign",
        templateName: selectedTemplate.name,
        audienceCount: validationStats?.valid ?? 0,
        sentAt: new Date().toLocaleString(),
        openRate: "48.6%",
        clickRate: "13.4%",
        bounceRate: "0.9%",
      }

      setSendSummary(summary)
      setIsSending(false)
      setPhase("sent")
      addMessage({ role: "bot", kind: "sent", text: "Sent." })
    }, 1200)
  }

  const handleOpenPreview = (template: TemplateOption, data: TemplateEditorData) => {
    setPreviewTemplate(template)
    setPreviewData(data)
    setPreviewViewport("desktop")
    setIsPreviewOpen(true)
  }

  const applyEditorPrompt = (rawPrompt: string) => {
    const prompt = rawPrompt.trim()
    if (!prompt) return

    const text = prompt.toLowerCase()
    const target: EditorTarget = text.includes("subheadline")
      ? "subheadline"
      : text.includes("cta") || text.includes("button")
        ? "ctaText"
        : text.includes("offer")
          ? "offerTitle"
          : "headline"
    let assistantReply = ""

    setEditorData((prev) => {
      const next = { ...prev }

      if (target === "headline") {
        if (text.includes("short")) {
          next.headline = "Limited seats this weekend"
          assistantReply = "Updated headline to a shorter conversion-focused version."
        } else if (text.includes("luxury") || text.includes("premium")) {
          next.headline = "A premium dining experience awaits"
          assistantReply = "Updated headline with a premium tone."
        } else {
          next.headline = `${prev.headline} · ${toTitleCase(prompt)}`
          assistantReply = "Applied your instruction to the headline."
        }
      }

      if (target === "subheadline") {
        if (text.includes("short")) {
          next.subheadline = "Reserve early for limited chef specials this week."
          assistantReply = "Shortened the subheadline while keeping the offer context."
        } else {
          next.subheadline = `${prev.subheadline} ${toTitleCase(prompt)}.`
          assistantReply = "Expanded the subheadline using your instruction."
        }
      }

      if (target === "ctaText") {
        if (text.includes("urgent")) {
          next.ctaText = "Reserve Before Friday"
          assistantReply = "CTA updated with urgency."
        } else {
          next.ctaText = "Book Your Table"
          assistantReply = "CTA updated to a clear booking action."
        }
      }

      if (target === "offerTitle") {
        next.offerTitle = toTitleCase(prompt)
        assistantReply = "Offer title updated."
      }

      return next
    })

    return assistantReply || "Applied your changes to the template."
  }

  const openEditor = () => {
    setIsEditorOpen(true)
    setView("chat")
  }

  const applyEditorChanges = () => {
    setIsEditorOpen(false)
    setView("chat")
  }

  const handleSidebarSelect = (tab: SidebarTab) => {
    setMobileMenuOpen(false)
    navigateToTab(tab)
    if (tab === "chat") setView("chat")
  }

  const handleSettingsSidebarSelect = (item: SettingsSection | "pricing" | "checkout") => {
    setMobileMenuOpen(false)
    if (item === "pricing" || item === "checkout") {
      navigateToTab(item)
      return
    }
    navigateToSettingsSection(item)
  }

  const handleSignOut = async () => {
    if (isSigningOut) return
    setIsSigningOut(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/login")
      router.refresh()
    } finally {
      setIsSigningOut(false)
    }
  }

  useEffect(() => {
    if (!isChatRoute || view !== "chat") return
    const container = chatScrollContainerRef.current
    if (!container) return
    requestAnimationFrame(() => {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" })
    })
  }, [messages.length, isGeneratingTemplates, isValidating, isSending, isChatRoute, view])

  const inputDisabled = !isChatRoute || (phase !== "initial" && phase !== "emails")
  const isSettingsSuiteRoute = pathnameTab === "settings" || pathnameTab === "pricing" || pathnameTab === "checkout"
  const pageTitleMap: Record<SidebarTab, string> = {
    chat: "Chat",
    templates: "Templates",
    contacts: "Contacts",
    sent: "Sent Campaigns",
    settings: "Settings",
    pricing: "Pricing",
    checkout: "Checkout",
  }
  const pageTitle = pageTitleMap[pathnameTab]
  const navigationItems = isSettingsSuiteRoute
    ? settingsSidebarItems.map((item) => ({
        id: item.id,
        label: item.label,
        icon: item.icon,
        active:
          item.id === "pricing" || item.id === "checkout"
            ? pathnameTab === item.id
            : pathnameTab === "settings" && activeSettingsSection === item.id,
        onSelect: () => handleSettingsSidebarSelect(item.id),
      }))
    : sidebarItems.map((item) => ({
        id: item.id,
        label: item.label,
        icon: item.icon,
        active: pathnameTab === item.id,
        onSelect: () => handleSidebarSelect(item.id),
      }))
  const sidebarTitle = isSettingsSuiteRoute ? "Settings" : "mailerblaster AI"
  const drawerDescription = isSettingsSuiteRoute ? "Manage account, plan, and billing." : "Move through workspace pages."

  return (
    <main className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#1f2937_0%,#09090b_42%,#030712_100%)] text-zinc-100">
      <div className="h-full p-0">
        <div className="flex h-full overflow-hidden bg-zinc-950/80 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <aside
            className={cn(
              "hidden h-full shrink-0 flex-col overflow-hidden border-r border-zinc-800/90 bg-zinc-950/92 p-3 lg:flex",
              sidebarExpanded ? "lg:w-56" : "lg:w-20",
            )}
          >
            <div className="mb-3 flex items-center justify-between">
              {sidebarExpanded ? <p className="text-sm font-semibold text-zinc-200">{sidebarTitle}</p> : <div className="h-6" />}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setSidebarExpanded((prev) => !prev)}
                onMouseEnter={() => setSidebarToggleHovered(true)}
                onMouseLeave={() => setSidebarToggleHovered(false)}
                className="text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              >
                {sidebarExpanded ? (
                  <HoverAnimatedIcon icon={PanelLeftCloseIcon} active={sidebarToggleHovered} size={16} className="h-4 w-4" />
                ) : (
                  <HoverAnimatedIcon icon={PanelLeftOpenIcon} active={sidebarToggleHovered} size={16} className="h-4 w-4" />
                )}
              </Button>
            </div>

            <nav className="space-y-1.5">
              {navigationItems.map((item) => (
                <SidebarNavigationButton key={item.id} item={item} sidebarExpanded={sidebarExpanded} />
              ))}
            </nav>

            <div className={cn("mt-auto space-y-3", sidebarExpanded ? "pt-4" : "pt-3")}>
              <CreditsMeter credits={credits} maxCredits={maxCredits} compact={!sidebarExpanded} />
              <UserMenu
                credits={credits}
                maxCredits={maxCredits}
                isSigningOut={isSigningOut}
                onNavigateSettingsSection={navigateToSettingsSection}
                onSignOut={handleSignOut}
                sidebarExpanded={sidebarExpanded}
              />
            </div>

          </aside>

          <section className="flex min-h-0 min-w-0 flex-1 flex-col p-3 sm:p-4 lg:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <MobileNavigationDrawer
                  items={navigationItems}
                  open={mobileMenuOpen}
                  onOpenChange={setMobileMenuOpen}
                  description={drawerDescription}
                  credits={credits}
                  maxCredits={maxCredits}
                  onSignOut={handleSignOut}
                />
                <h1 className="truncate text-lg font-semibold text-zinc-100">{pageTitle}</h1>
              </div>
              <div className="flex items-center gap-2">
                {isChatRoute && view === "summary" ? (
                  <Button
                    variant="outline"
                    className="border-zinc-700 bg-zinc-950 text-zinc-100 hover:bg-zinc-800"
                    onClick={() => setView("chat")}
                  >
                    <ChevronLeftIcon size={16} className="h-4 w-4" /> Chat
                  </Button>
                ) : null}
                {isSettingsSuiteRoute ? (
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="border-zinc-800 bg-zinc-950/70 text-zinc-200 hover:bg-zinc-900"
                    onClick={() => navigateToTab("chat")}
                    onMouseEnter={() => setTopExitHovered(true)}
                    onMouseLeave={() => setTopExitHovered(false)}
                    aria-label="Exit settings"
                  >
                    <HoverAnimatedIcon icon={XIcon} active={topExitHovered} size={16} className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="border-zinc-800 bg-zinc-950/70 text-zinc-200 hover:bg-zinc-900"
                    onClick={() => navigateToSettingsSection("profile")}
                    onMouseEnter={() => setTopSettingsHovered(true)}
                    onMouseLeave={() => setTopSettingsHovered(false)}
                    aria-label="Open settings"
                  >
                    <HoverAnimatedIcon icon={CogIcon} active={topSettingsHovered} size={16} className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {isChatRoute ? (
              view === "chat" ? (
                <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[30px] bg-zinc-950/70 shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
                  <GlowingEffect disabled={false} spread={34} blur={2} borderWidth={2} className="rounded-[30px]" />
                  <div className="pointer-events-none absolute -left-24 -top-20 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-28 right-6 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
                  <div ref={chatScrollContainerRef} className="scrollbar-hide min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5 md:px-6 md:py-6">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        ref={(el) => {
                          messageRefs.current[message.id] = el
                        }}
                      >
                        <MessageBubble
                          message={message}
                          phase={phase}
                          promptTopic={promptTopic}
                          editorData={editorData}
                          isGeneratingTemplates={isGeneratingTemplates}
                          isValidating={isValidating}
                          isSending={isSending}
                          selectedTemplate={selectedTemplate}
                          validationStats={validationStats}
                          onTemplateSelect={handleTemplateSelect}
                          onOpenPreview={handleOpenPreview}
                          onEditTemplate={openEditor}
                          onContinueToConfirm={handleContinueFromTemplateReview}
                          onSendNow={handleSendNow}
                          onChangeTemplate={handleChangeTemplate}
                          onOpenSummary={() => setView("summary")}
                        />
                      </div>
                    ))}

                    {isGeneratingTemplates && <ActivityBubble label="Generating templates" />}
                    {isValidating && <ActivityBubble label="Validating emails" />}
                    {isSending && <ActivityBubble label="Sending" />}
                  </div>

                  <div className="bg-zinc-950/75 p-3 md:p-4">
                    <div className="flex items-center gap-2 rounded-2xl bg-zinc-900/80 p-2 shadow-inner">
                      <Input
                        value={composerText}
                        onChange={(event) => setComposerText(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault()
                            handleComposerSubmit()
                          }
                        }}
                        placeholder={composerPlaceholder}
                        disabled={inputDisabled}
                        className="h-11 rounded-xl border border-zinc-700/70 bg-zinc-950/90 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-zinc-500/80 focus-visible:ring-1 focus-visible:ring-sky-500/30"
                      />
                      <Button
                        onClick={handleComposerSubmit}
                        disabled={!composerText.trim() || inputDisabled}
                        className="h-11 rounded-xl bg-sky-500 text-zinc-950 hover:bg-sky-400"
                      >
                        <ArrowRightIcon size={16} className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <SentSummaryPage summary={sendSummary} selectedTemplate={selectedTemplate} editorData={editorData} />
              )
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl bg-zinc-900/55">
                <SidebarPageContent
                  tab={pathnameTab}
                  sendSummary={sendSummary}
                  selectedTemplate={selectedTemplate}
                  editorData={editorData}
                  onOpenPreview={handleOpenPreview}
                  settingsSection={activeSettingsSection}
                  onGoToCheckout={() => navigateToTab("checkout")}
                />
              </div>
            )}
          </section>
        </div>
      </div>

      {isPreviewOpen && previewTemplate && (
        <FullscreenTemplatePreview
          template={previewTemplate}
          data={previewData}
          viewport={previewViewport}
          setViewport={setPreviewViewport}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}

      {isEditorOpen && selectedTemplate && (
        <TemplateEditorView
          template={selectedTemplate}
          data={editorData}
          setData={setEditorData}
          onAiPrompt={applyEditorPrompt}
          viewport={editorViewport}
          setViewport={setEditorViewport}
          onClose={() => setIsEditorOpen(false)}
          onApply={applyEditorChanges}
        />
      )}
    </main>
  )
}

function MobileNavigationDrawer({
  items,
  open,
  onOpenChange,
  description,
  credits,
  maxCredits,
  onSignOut,
}: {
  items: NavigationItem[]
  open: boolean
  onOpenChange: (open: boolean) => void
  description: string
  credits: number
  maxCredits: number
  onSignOut: () => void
}) {
  return (
    <Drawer direction="left" open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>
        <Button variant="outline" size="icon-sm" className="border-zinc-700 bg-zinc-950 text-zinc-100 hover:bg-zinc-800 lg:hidden">
          <MenuIcon size={16} className="h-4 w-4" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
        <DrawerHeader>
          <DrawerTitle>Navigation</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        <div className="space-y-2 px-4 pb-4">
          <CreditsMeter credits={credits} maxCredits={maxCredits} />
          {items.map((item) => (
            <DrawerNavigationButton key={item.id} item={item} />
          ))}
          <Button variant="outline" className="mt-2 w-full border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800" onClick={onSignOut}>
            Logout
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function SidebarNavigationButton({
  item,
  sidebarExpanded,
}: {
  item: NavigationItem
  sidebarExpanded: boolean
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      type="button"
      onClick={item.onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
        item.active ? "bg-sky-500/15 text-sky-100" : "text-zinc-400 hover:text-zinc-100",
      )}
    >
      <HoverAnimatedIcon icon={item.icon} active={hovered || item.active} size={16} className="h-4 w-4 shrink-0" />
      {sidebarExpanded && <span>{item.label}</span>}
    </button>
  )
}

function DrawerNavigationButton({ item }: { item: NavigationItem }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      type="button"
      onClick={item.onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "group flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition",
        item.active ? "bg-sky-500/15 text-sky-100" : "text-zinc-300 hover:text-zinc-100",
      )}
    >
      <HoverAnimatedIcon icon={item.icon} active={hovered || item.active} size={14} className="h-3.5 w-3.5" />
      {item.label}
    </button>
  )
}

function UserMenu({
  credits,
  maxCredits,
  isSigningOut,
  onNavigateSettingsSection,
  onSignOut,
  sidebarExpanded = false,
}: {
  credits: number
  maxCredits: number
  isSigningOut: boolean
  onNavigateSettingsSection: (section: SettingsSection) => void
  onSignOut: () => void
  sidebarExpanded?: boolean
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "transition",
            sidebarExpanded
              ? "flex w-full items-center gap-2 rounded-xl bg-zinc-900/70 px-2 py-2 text-left hover:bg-zinc-900"
              : "rounded-full border border-zinc-700/80 bg-zinc-900 p-0.5 hover:border-zinc-600",
          )}
          aria-label="Open user menu"
        >
          <Avatar className="size-7 !rounded-full ring-2 ring-sky-400/25">
            <AvatarImage src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=128&q=80" alt="User avatar" />
            <AvatarFallback className="bg-sky-500/20 text-sky-100">RP</AvatarFallback>
          </Avatar>
          {sidebarExpanded ? (
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium text-zinc-100">Ricardo Pires</span>
              <span className="block truncate text-[11px] text-zinc-400">Account menu</span>
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 border-zinc-700 bg-zinc-950 text-zinc-100" align={sidebarExpanded ? "start" : "end"}>
        <DropdownMenuLabel className="space-y-1">
          <p className="text-sm font-medium text-zinc-100">Ricardo Pires</p>
          <p className="text-xs text-zinc-400">ricardo@example.com</p>
          <Badge className="mt-1 rounded-full border border-amber-300/20 bg-amber-400/10 text-amber-200">
            <HandCoinsIcon size={14} className="mr-1 h-3.5 w-3.5" />
            {credits}/{maxCredits}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem className="focus:bg-zinc-800" onClick={() => onNavigateSettingsSection("profile")}>
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem className="focus:bg-zinc-800" onClick={() => onNavigateSettingsSection("plan")}>
          Plan
        </DropdownMenuItem>
        <DropdownMenuItem className="focus:bg-zinc-800" onClick={() => onNavigateSettingsSection("referals")}>
          Referals
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem
          className="focus:bg-zinc-800"
          onClick={onSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? "Signing out..." : "Logout"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function CreditsMeter({
  credits,
  maxCredits,
  compact = false,
}: {
  credits: number
  maxCredits: number
  compact?: boolean
}) {
  const percentage = Math.max(0, Math.min(100, (credits / maxCredits) * 100))

  return (
    <div className={cn("rounded-2xl bg-zinc-900/70", compact ? "px-2 py-2" : "px-3 py-2.5")}>
      <div className="flex items-center justify-between text-xs">
        <div className="inline-flex items-center gap-1.5 text-zinc-300">
          <HandCoinsIcon size={14} className="h-3.5 w-3.5 text-amber-300" />
          {compact ? "AI" : "AI Credits"}
        </div>
        <p className="font-medium text-amber-200">
          {credits}/{maxCredits}
        </p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-400" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}

function SidebarPageContent({
  tab,
  sendSummary,
  selectedTemplate,
  editorData,
  onOpenPreview,
  settingsSection,
  onGoToCheckout,
}: {
  tab: SidebarTab
  sendSummary: SendSummary | null
  selectedTemplate: TemplateOption | null
  editorData: TemplateEditorData
  onOpenPreview: (template: TemplateOption, data: TemplateEditorData) => void
  settingsSection: SettingsSection
  onGoToCheckout: () => void
}) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly")

  if (tab === "templates") {
    return (
      <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-zinc-100">Template library</h2>
          <p className="text-sm text-zinc-400">Browse professional themes and open full preview for each one.</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {templateOptions.map((template) => {
            const data = buildEditorData(template.theme, template)
            return <TemplateLibraryCard key={template.id} template={template} data={data} onOpenPreview={() => onOpenPreview(template, data)} />
          })}
        </div>
      </div>
    )
  }

  if (tab === "contacts") {
    return (
      <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-zinc-100">Contacts</h2>
          <p className="text-sm text-zinc-400">Contact lists, segments, and import sources.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl border-zinc-700/80 bg-zinc-950/80">
            <CardHeader>
              <CardTitle className="text-zinc-100">Total contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-zinc-100">12,480</p>
              <p className="text-xs text-zinc-400">Across all segments</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-zinc-700/80 bg-zinc-950/80">
            <CardHeader>
              <CardTitle className="text-zinc-100">New this week</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-emerald-300">+386</p>
              <p className="text-xs text-zinc-400">From forms and imports</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-zinc-700/80 bg-zinc-950/80">
            <CardHeader>
              <CardTitle className="text-zinc-100">Suppressed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-amber-300">142</p>
              <p className="text-xs text-zinc-400">Bounces + unsubscribed</p>
            </CardContent>
          </Card>
        </div>
        <Card className="mt-4 rounded-2xl border-zinc-700/80 bg-zinc-950/80">
          <CardHeader>
            <CardTitle className="text-zinc-100">Segments</CardTitle>
            <CardDescription>Use the Chat page to run campaign delivery and recipient validation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-300">
            <p>• VIP tasting members: 1,124 contacts</p>
            <p>• Weekend diners: 4,308 contacts</p>
            <p>• Vegetarian + vegan list: 2,090 contacts</p>
            <p>• New subscribers (30d): 1,780 contacts</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (tab === "sent") {
    return sendSummary ? (
      <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <SentSummaryPage summary={sendSummary} selectedTemplate={selectedTemplate} editorData={editorData} />
      </div>
    ) : (
      <div className="flex min-h-0 flex-1 items-center justify-center p-4 md:p-6">
        <Card className="w-full max-w-xl rounded-2xl border-zinc-700/80 bg-zinc-950/80">
          <CardHeader>
            <CardTitle className="text-zinc-100">No campaigns sent yet</CardTitle>
            <CardDescription>Send a campaign from the Chat page to populate this dashboard.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (tab === "settings") {
    return (
      <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <div className="relative mb-5 overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_top_left,#1d4ed8_0%,#111827_42%,#020617_100%)] px-5 py-5 sm:px-6">
          <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-10 h-40 w-40 rounded-full bg-emerald-400/15 blur-3xl" />
          <p className="text-xs uppercase tracking-[0.16em] text-sky-200/85">Account control center</p>
          <p className="mt-1 text-sm text-zinc-200/90">Use the left navigation to manage profile, plan, usage, referrals, pricing, and checkout.</p>
          <div className="mt-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-100">
            Workspace admin: ricardo@example.com
          </div>
        </div>

        {settingsSection === "profile" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-3xl border-0 bg-zinc-950/70">
              <CardHeader>
                <CardTitle className="text-zinc-100">Profile</CardTitle>
                <CardDescription>Identity and brand defaults.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input value="Ricardo Pires" readOnly className="h-10 border-zinc-800/70 bg-zinc-900/80 text-zinc-100" />
                <Input value="ricardo@example.com" readOnly className="h-10 border-zinc-800/70 bg-zinc-900/80 text-zinc-100" />
                <Input value="Europe/Lisbon" readOnly className="h-10 border-zinc-800/70 bg-zinc-900/80 text-zinc-100" />
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-0 bg-zinc-950/70">
              <CardHeader>
                <CardTitle className="text-zinc-100">Brand profile</CardTitle>
                <CardDescription>Applied to generated newsletters.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-zinc-300">
                <p>• Sender name: mailerblaster AI</p>
                <p>• Reply-to: hello@mailerblaster.ai</p>
                <p>• Default locale: en-US</p>
                <p>• Content style: professional</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {settingsSection === "plan" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-3xl border-0 bg-zinc-950/70">
              <CardHeader>
                <CardTitle className="text-zinc-100">Current plan</CardTitle>
                <CardDescription>Growth plan active</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-zinc-300">
                <p>• Contacts included: 20,000</p>
                <p>• AI templates: unlimited</p>
                <p>• Team seats: 3</p>
                <p>• Billing cycle: monthly</p>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-0 bg-zinc-950/70">
              <CardHeader>
                <CardTitle className="text-zinc-100">Upgrade plan</CardTitle>
                <CardDescription>Move to a higher tier anytime.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-zinc-300">Choose a new plan and continue to secure checkout.</p>
                <Button className="w-full rounded-xl bg-sky-500 text-zinc-950 hover:bg-sky-400" onClick={onGoToCheckout}>
                  Choose plan
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {settingsSection === "usage" ? (
          <SettingsUsageCharts />
        ) : null}

        {settingsSection === "referals" ? (
          <Card className="rounded-3xl border-0 bg-zinc-950/70">
            <CardHeader>
              <CardTitle className="text-zinc-100">Referals</CardTitle>
              <CardDescription>Invite teams and earn credits for successful referrals.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value="https://mailerblaster.ai/r/ref-rp-2026" readOnly className="h-10 border-zinc-800/70 bg-zinc-900/80 text-zinc-100" />
              <p className="text-sm text-zinc-300">Current reward: 50 credits per converted referral.</p>
              <p className="text-xs text-zinc-400">Referrals this quarter: 4 successful</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    )
  }

  if (tab === "pricing") {
    const plans = [
      {
        name: "Starter",
        monthly: 19,
        description: "For small teams shipping consistently.",
        features: ["2,000 contacts", "Basic templates", "Email support"],
      },
      {
        name: "Growth",
        monthly: 79,
        description: "Best for growing hospitality brands.",
        features: ["20,000 contacts", "Advanced templates", "Priority support"],
        highlighted: true,
      },
      {
        name: "Scale",
        monthly: 199,
        description: "High-volume automation and dedicated support.",
        features: ["100,000 contacts", "Custom branding", "Dedicated manager"],
      },
    ]
    const isAnnual = billingCycle === "annual"

    return (
      <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <div className="relative mb-5 overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_top_left,#0f766e_0%,#111827_52%,#020617_100%)] px-5 py-5 sm:px-6">
          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-emerald-300/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-6 h-44 w-44 rounded-full bg-sky-400/15 blur-3xl" />
          <p className="text-xs uppercase tracking-[0.16em] text-emerald-100/85">Pricing built to scale</p>
          <p className="mt-1 max-w-2xl text-sm text-zinc-200/90">
            Switch between monthly and annual billing. Annual plans include a 20% discount and priority onboarding.
          </p>
          <div className="mt-4 inline-flex rounded-2xl bg-zinc-950/65 p-1">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={cn(
                "rounded-xl px-4 py-1.5 text-xs font-medium transition",
                billingCycle === "monthly" ? "bg-zinc-100 text-zinc-900" : "text-zinc-300",
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("annual")}
              className={cn(
                "rounded-xl px-4 py-1.5 text-xs font-medium transition",
                billingCycle === "annual" ? "bg-zinc-100 text-zinc-900" : "text-zinc-300",
              )}
            >
              Annual
            </button>
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          {plans.map((plan) => {
            const annualPerMonth = Math.round(plan.monthly * 0.8)
            const shownPrice = isAnnual ? annualPerMonth : plan.monthly
            const annualTotal = plan.monthly * 12 * 0.8

            return (
              <CardSpotlight
                key={plan.name}
                className={cn(
                  "relative overflow-hidden rounded-[28px] border-zinc-700/60 bg-transparent p-0",
                  plan.highlighted ? "shadow-[0_0_0_1px_rgba(56,189,248,0.25),0_30px_90px_rgba(14,116,144,0.35)]" : "",
                )}
              >
                <div className="relative z-20 rounded-[27px] px-6 py-6">
                  {plan.highlighted ? (
                    <div className="absolute right-4 top-4 rounded-full bg-sky-400/20 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-sky-100">
                      Most popular
                    </div>
                  ) : null}
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-x-0 top-0 h-24",
                      plan.highlighted
                        ? "bg-gradient-to-r from-sky-500/25 via-cyan-400/20 to-emerald-300/20"
                        : "bg-gradient-to-r from-zinc-600/20 via-zinc-500/10 to-zinc-700/20",
                    )}
                  />
                  <CardHeader className="relative px-0">
                    <CardTitle className="text-zinc-100">{plan.name}</CardTitle>
                    <CardDescription className="text-zinc-300">{plan.description}</CardDescription>
                    <div className="pt-2">
                      <p className="text-4xl font-semibold text-zinc-100">${shownPrice}</p>
                      <p className="text-xs text-zinc-400">{isAnnual ? "per month, billed annually" : "per month, billed monthly"}</p>
                      {isAnnual ? <p className="mt-1 text-xs text-emerald-300">Total ${annualTotal.toFixed(0)}/year</p> : null}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 px-0 text-sm text-zinc-300">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2">
                        <CircleCheckIcon size={14} className="h-3.5 w-3.5 text-emerald-300" />
                        {feature}
                      </div>
                    ))}
                    <Button
                      className={cn(
                        "mt-2 w-full rounded-xl",
                        plan.highlighted ? "bg-sky-500 text-zinc-950 hover:bg-sky-400" : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
                      )}
                      onClick={onGoToCheckout}
                    >
                      Choose {plan.name}
                    </Button>
                  </CardContent>
                </div>
              </CardSpotlight>
            )
          })}
        </div>
      </div>
    )
  }

  if (tab === "checkout") {
    return (
      <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mb-5">
          <p className="text-sm text-zinc-400">Stripe-inspired payment experience with instant activation after payment.</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
          <Card className="rounded-3xl border-0 bg-zinc-950/72 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-2 text-zinc-100">
                <LockIcon size={16} className="h-4 w-4 text-emerald-300" />
                Payment details
              </CardTitle>
              <CardDescription>Your payment information is encrypted and secure.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="inline-flex rounded-xl bg-zinc-900/80 p-1 text-xs">
                <button type="button" className="rounded-lg bg-zinc-100 px-3 py-1.5 font-medium text-zinc-900">
                  Card
                </button>
                <button type="button" className="rounded-lg px-3 py-1.5 text-zinc-400">
                  Link
                </button>
              </div>

              <div className="space-y-3">
                <Input value="Ricardo Pires" readOnly className="h-11 border-zinc-800/70 bg-zinc-900/75 text-zinc-100" />
                <Input value="ricardo@example.com" readOnly className="h-11 border-zinc-800/70 bg-zinc-900/75 text-zinc-100" />
                <Input value="4242 4242 4242 4242" readOnly className="h-11 border-zinc-800/70 bg-zinc-900/75 text-zinc-100" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Input value="12 / 29" readOnly className="h-11 border-zinc-800/70 bg-zinc-900/75 text-zinc-100" />
                <Input value="CVC 123" readOnly className="h-11 border-zinc-800/70 bg-zinc-900/75 text-zinc-100" />
              </div>

              <div className="rounded-2xl bg-zinc-900/70 px-3 py-3 text-xs text-zinc-300">
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon size={16} className="h-4 w-4 text-emerald-300" />
                  256-bit TLS encryption. PCI-compliant payment processing.
                </div>
              </div>

              <Button className="h-11 w-full rounded-xl bg-emerald-400 text-zinc-950 hover:bg-emerald-300">
                Pay $79.00
              </Button>
            </CardContent>
          </Card>

          <Card className="h-fit rounded-3xl border-0 bg-zinc-950/68 xl:sticky xl:top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-zinc-100">
                <IdCardIcon size={16} className="h-4 w-4 text-sky-300" />
                Order summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-zinc-300">
              <div className="rounded-2xl bg-zinc-900/70 p-3">
                <p className="font-medium text-zinc-100">Growth plan</p>
                <p className="text-xs text-zinc-400">Monthly subscription for restaurant teams</p>
              </div>
              <div className="space-y-2">
                <p className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>$79.00</span>
                </p>
                <p className="flex items-center justify-between">
                  <span>Tax</span>
                  <span>$0.00</span>
                </p>
                <p className="flex items-center justify-between pt-1 text-base font-semibold text-zinc-100">
                  <span>Total</span>
                  <span>$79.00</span>
                </p>
              </div>
              <div className="space-y-1 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <CircleCheckIcon size={14} className="h-3.5 w-3.5 text-emerald-300" />
                  Instant account activation
                </div>
                <div className="flex items-center gap-2">
                  <CircleCheckIcon size={14} className="h-3.5 w-3.5 text-emerald-300" />
                  Cancel anytime from settings
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-4 md:p-6">
      <p className="text-sm text-zinc-400">Open the Chat page to create and send campaigns.</p>
    </div>
  )
}

function SettingsUsageCharts() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl border-0 bg-zinc-950/68">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-zinc-200">Email sends</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-zinc-100">8,412</p>
            <p className="text-xs text-zinc-400">of 20,000 this cycle</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-0 bg-zinc-950/68">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-zinc-200">Avg. open rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-emerald-300">52.4%</p>
            <p className="text-xs text-zinc-400">last 7 days</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-0 bg-zinc-950/68">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-zinc-200">Credits remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-amber-200">120</p>
            <p className="text-xs text-zinc-400">renews in 12 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-3xl border-0 bg-zinc-950/72">
          <CardHeader className="pb-2">
            <CardTitle className="text-zinc-100">Sends vs opens</CardTitle>
            <CardDescription>Last 7 days campaign performance.</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <ChartContainer config={usageChartConfig} className="h-[250px] w-full">
              <AreaChart data={usageTimeline}>
                <defs>
                  <linearGradient id="fillSends" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-sends)" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="var(--color-sends)" stopOpacity={0.08} />
                  </linearGradient>
                  <linearGradient id="fillOpens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-opens)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-opens)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.18} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="sends" stroke="var(--color-sends)" fill="url(#fillSends)" strokeWidth={2.2} />
                <Area type="monotone" dataKey="opens" stroke="var(--color-opens)" fill="url(#fillOpens)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 bg-zinc-950/72">
          <CardHeader className="pb-2">
            <CardTitle className="text-zinc-100">Usage mix</CardTitle>
            <CardDescription>Where credits are consumed.</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <ChartContainer config={usageChartConfig} className="h-[250px] w-full">
              <BarChart data={usageByChannel} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" opacity={0.12} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="channel" hide />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey="value" radius={10} fill="var(--color-value)" />
              </BarChart>
            </ChartContainer>
            <div className="mt-3 space-y-2 text-xs text-zinc-300">
              <p className="flex items-center justify-between">
                <span>Campaign generation</span>
                <span>58%</span>
              </p>
              <p className="flex items-center justify-between">
                <span>Automation tasks</span>
                <span>26%</span>
              </p>
              <p className="flex items-center justify-between">
                <span>Referrals and extras</span>
                <span>16%</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  phase,
  promptTopic,
  editorData,
  isGeneratingTemplates,
  isValidating,
  isSending,
  selectedTemplate,
  validationStats,
  onTemplateSelect,
  onOpenPreview,
  onEditTemplate,
  onContinueToConfirm,
  onSendNow,
  onChangeTemplate,
  onOpenSummary,
}: {
  message: ChatMessage
  phase: Phase
  promptTopic: string
  editorData: TemplateEditorData
  isGeneratingTemplates: boolean
  isValidating: boolean
  isSending: boolean
  selectedTemplate: TemplateOption | null
  validationStats: ValidationStats | null
  onTemplateSelect: (template: TemplateOption) => void
  onOpenPreview: (template: TemplateOption, data: TemplateEditorData) => void
  onEditTemplate: () => void
  onContinueToConfirm: () => void
  onSendNow: () => void
  onChangeTemplate: () => void
  onOpenSummary: () => void
}) {
  const isBot = message.role === "bot"
  const [reviewEditHovered, setReviewEditHovered] = useState(false)

  return (
    <div className={cn("flex", isBot ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[96%] rounded-2xl px-3.5 py-3 text-sm",
          isBot ? "bg-zinc-900/80 text-zinc-100" : "bg-sky-500/20 text-sky-100",
        )}
      >
        {message.text && <p className="leading-relaxed">{message.text}</p>}

        {message.kind === "templates" && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-zinc-400">Four themed templates. Scroll horizontally to compare.</p>
            <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-2 pr-1">
              {templateOptions.map((template) => {
                const selected = selectedTemplate?.id === template.id
                const previewData = buildEditorData(promptTopic || template.theme, template)

                return (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    data={previewData}
                    selected={selected}
                    disabled={phase !== "templates" || isGeneratingTemplates}
                    onSelect={() => onTemplateSelect(template)}
                    onPreview={() => onOpenPreview(template, previewData)}
                  />
                )
              })}
            </div>
          </div>
        )}

        {message.kind === "validation" && validationStats ? (
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            <ValidationTile label="Total" value={String(validationStats.total)} tone="text-zinc-100" />
            <ValidationTile label="Valid" value={String(validationStats.valid)} tone="text-emerald-300" />
            <ValidationTile label="Invalid" value={String(validationStats.invalid)} tone="text-amber-300" />
            <ValidationTile label="Duplicates" value={String(validationStats.duplicates)} tone="text-rose-300" />
          </div>
        ) : null}

        {message.kind === "templateReview" && selectedTemplate ? (
          <div className="mt-3 space-y-3">
            <div className="relative rounded-[24px] bg-transparent p-0">
              <GlowingEffect disabled={false} spread={28} blur={1} borderWidth={0} className="rounded-[24px]" />
              <CardContent className="relative z-20 space-y-3 bg-transparent px-3 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{selectedTemplate.name}</p>
                    <p className="text-xs text-zinc-500">Chosen template</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon-sm"
                      onClick={onEditTemplate}
                      onMouseEnter={() => setReviewEditHovered(true)}
                      onMouseLeave={() => setReviewEditHovered(false)}
                      className="group/edit rounded-xl bg-zinc-900/80 text-zinc-100 hover:bg-zinc-800"
                      aria-label="Edit selected template"
                    >
                      <HoverAnimatedIcon icon={FilePenLineIcon} active={reviewEditHovered} size={14} className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <TemplatePreview template={selectedTemplate} data={editorData} heightClass="h-[320px]" scale={0.34} />
              </CardContent>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                onClick={onChangeTemplate}
                className="rounded-xl bg-zinc-900/80 text-zinc-100 hover:bg-zinc-800"
              >
                Change template
              </Button>
              <Button
                onClick={onContinueToConfirm}
                disabled={phase !== "reviewTemplate"}
                className="rounded-xl bg-sky-500 text-zinc-950 hover:bg-sky-400"
              >
                Continue
              </Button>
            </div>
          </div>
        ) : null}

        {message.kind === "confirm" ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              onClick={onSendNow}
              disabled={phase !== "confirm" || isSending}
              className="rounded-xl bg-emerald-400 text-zinc-950 hover:bg-emerald-300"
            >
              Send now
            </Button>
            <Button
              onClick={onChangeTemplate}
              className="rounded-xl bg-zinc-900/80 text-zinc-100 hover:bg-zinc-800"
            >
              Change template
            </Button>
          </div>
        ) : null}

        {message.kind === "sent" ? (
          <div className="mt-3 flex items-center gap-2">
            <CircleCheckIcon size={16} className="h-4 w-4 text-emerald-300" />
            <Button onClick={onOpenSummary} className="rounded-xl bg-sky-500 text-zinc-950 hover:bg-sky-400">
              Open summary
            </Button>
          </div>
        ) : null}

        {(isValidating || isSending) && message.kind === "text" ? (
          <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
            <LoaderPinwheelIcon size={14} className="h-3.5 w-3.5 animate-spin" />
            Processing
          </div>
        ) : null}
      </div>
    </div>
  )
}

function TemplateLibraryCard({
  template,
  data,
  onOpenPreview,
}: {
  template: TemplateOption
  data: TemplateEditorData
  onOpenPreview: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <CardSpotlight className="group relative h-[520px] overflow-hidden rounded-[24px] bg-zinc-950/45 p-0">
      <div className="relative z-20 flex h-full flex-col space-y-3 rounded-[24px] px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-zinc-100">{template.name}</p>
            <p className="text-xs text-zinc-400">
              {template.theme} · {template.audience}
            </p>
          </div>
          <Badge className="rounded-full bg-zinc-900/65 text-zinc-200">{template.tone}</Badge>
        </div>
        <TemplatePreview template={template} data={data} autoScroll />
        <p className="text-xs text-zinc-300">{template.description}</p>
        <Button
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="w-full rounded-xl bg-zinc-900/80 text-zinc-100 hover:bg-zinc-800"
          onClick={onOpenPreview}
        >
          <HoverAnimatedIcon icon={EyeIcon} active={hovered} size={14} className="h-3.5 w-3.5" />
        </Button>
      </div>
    </CardSpotlight>
  )
}

function TemplateCard({
  template,
  data,
  selected,
  disabled,
  onSelect,
  onPreview,
}: {
  template: TemplateOption
  data: TemplateEditorData
  selected: boolean
  disabled: boolean
  onSelect: () => void
  onPreview: () => void
}) {
  const [previewHovered, setPreviewHovered] = useState(false)

  return (
    <Card className="group relative h-[520px] w-[290px] shrink-0 overflow-hidden rounded-[24px] border-0 bg-zinc-950/45 p-0 shadow-[0_18px_45px_rgba(0,0,0,0.28)] sm:w-[330px]">
      <GlowingEffect disabled={false} spread={34} blur={1} borderWidth={0} className="rounded-[24px]" />
      <CardContent className="relative z-20 flex h-full flex-col space-y-3 rounded-[24px] bg-transparent px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-zinc-100">{template.name}</p>
            <p className="text-xs text-zinc-400">
              {template.theme} · {template.audience}
            </p>
          </div>
          {selected ? (
            <Badge className="rounded-full bg-emerald-500/20 text-emerald-200">
              <CircleCheckIcon size={14} className="mr-1 h-3.5 w-3.5" />
              Selected
            </Badge>
          ) : null}
        </div>

        <TemplatePreview template={template} data={data} autoScroll />

        <p className="text-xs leading-relaxed text-zinc-300">{template.description}</p>
        <p className="text-[11px] uppercase tracking-wide text-zinc-500">{template.tone}</p>

        <div className="mt-auto grid grid-cols-2 gap-2">
          {selected ? (
            <Button
              size="sm"
              onClick={onSelect}
              disabled={disabled}
              className="col-span-2 rounded-xl bg-zinc-900/80 text-zinc-100 hover:bg-zinc-800"
            >
              Selected
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                onClick={onPreview}
                onMouseEnter={() => setPreviewHovered(true)}
                onMouseLeave={() => setPreviewHovered(false)}
                className="rounded-xl bg-zinc-900/80 text-zinc-100 hover:bg-zinc-800"
              >
                <HoverAnimatedIcon icon={EyeIcon} active={previewHovered} size={14} className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                onClick={onSelect}
                disabled={disabled}
                className="rounded-xl bg-zinc-900/80 text-zinc-100 hover:bg-zinc-800"
              >
                Select
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function TemplatePreview({
  template,
  data,
  heightClass = "h-56",
  scale = 0.28,
  autoScroll = false,
}: {
  template: TemplateOption
  data: TemplateEditorData
  heightClass?: string
  scale?: number
  autoScroll?: boolean
}) {
  const baseWidth = 640

  return (
    <div className={cn("flex items-center justify-center overflow-hidden rounded-[24px] bg-transparent", heightClass)}>
      <div style={{ width: baseWidth * scale }}>
        <div className={cn(autoScroll ? "template-preview-auto-scroll" : "")}>
          <div style={{ width: baseWidth, transform: `scale(${scale})`, transformOrigin: "top left" }}>
            <TemplateCanvas template={template} data={data} />
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewModeSwitch({
  mode,
  onChange,
  iconOnly = true,
}: {
  mode: PreviewMode
  onChange: (mode: PreviewMode) => void
  iconOnly?: boolean
}) {
  return (
    <div className={cn("inline-flex items-center rounded-full bg-zinc-950/75 p-1 backdrop-blur", iconOnly ? "gap-0.5" : "gap-1")}>
      <PreviewModeButton mode={mode} target="desktop" onChange={onChange} icon={MonitorCheckIcon} iconOnly={iconOnly} />
      <PreviewModeButton mode={mode} target="tablet" onChange={onChange} icon={LayoutPanelTopIcon} iconOnly={iconOnly} />
      <PreviewModeButton mode={mode} target="mobile" onChange={onChange} icon={SmartphoneChargingIcon} iconOnly={iconOnly} />
    </div>
  )
}

function PreviewModeButton({
  mode,
  target,
  onChange,
  icon: Icon,
  iconOnly = false,
}: {
  mode: PreviewMode
  target: PreviewMode
  onChange: (mode: PreviewMode) => void
  icon: AppIcon
  iconOnly?: boolean
}) {
  const spec = viewportSpecs[target]
  const selected = mode === target
  const [hovered, setHovered] = useState(false)

  return (
    <button
      type="button"
      onClick={() => onChange(target)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "group inline-flex items-center justify-center rounded-full transition-all duration-200",
        iconOnly ? "h-8 w-8" : "h-9 w-9",
        selected ? "bg-zinc-100 text-zinc-900" : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-100",
      )}
      aria-label={spec.label}
    >
      <HoverAnimatedIcon icon={Icon} active={hovered || selected} size={14} className="h-3.5 w-3.5" />
    </button>
  )
}

function FullscreenTemplatePreview({
  template,
  data,
  viewport,
  setViewport,
  onClose,
}: {
  template: TemplateOption
  data: TemplateEditorData
  viewport: PreviewMode
  setViewport: (mode: PreviewMode) => void
  onClose: () => void
}) {
  const [closeHovered, setCloseHovered] = useState(false)

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      <div className="flex h-full flex-col p-2 md:p-4">
        <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
          <PreviewModeSwitch mode={viewport} onChange={setViewport} iconOnly />
          <Button
            size="icon-sm"
            onClick={onClose}
            onMouseEnter={() => setCloseHovered(true)}
            onMouseLeave={() => setCloseHovered(false)}
            className="rounded-full bg-zinc-950/80 text-zinc-100 hover:bg-zinc-900"
            aria-label="Close preview"
          >
            <HoverAnimatedIcon icon={XIcon} active={closeHovered} size={16} className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2 md:p-4">
          <DevicePreviewFrame template={template} data={data} viewport={viewport} minimal />
        </div>
      </div>
    </div>
  )
}

function TemplateEditorView({
  template,
  data,
  setData,
  onAiPrompt,
  viewport,
  setViewport,
  onClose,
  onApply,
}: {
  template: TemplateOption
  data: TemplateEditorData
  setData: React.Dispatch<React.SetStateAction<TemplateEditorData>>
  onAiPrompt: (prompt: string) => string | void
  viewport: PreviewMode
  setViewport: (mode: PreviewMode) => void
  onClose: () => void
  onApply: () => void
}) {
  const [chatInput, setChatInput] = useState("")
  const [applyHovered, setApplyHovered] = useState(false)
  const [closeHovered, setCloseHovered] = useState(false)
  const [sendHovered, setSendHovered] = useState(false)
  const [chatMessages, setChatMessages] = useState<EditorChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      text: "Describe any change and I will update the template inline. Example: make the headline shorter and premium.",
    },
  ])

  const sendEditorPrompt = () => {
    const prompt = chatInput.trim()
    if (!prompt) return

    const userMessage: EditorChatMessage = { id: Date.now(), role: "user", text: prompt }
    const reply = onAiPrompt(prompt) || "Done. I updated the template."
    const assistantMessage: EditorChatMessage = { id: Date.now() + 1, role: "assistant", text: reply }

    setChatMessages((prev) => [...prev, userMessage, assistantMessage])
    setChatInput("")
  }

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 text-zinc-100">
      <div className="flex h-full flex-col px-3 pb-3 pt-2 md:px-4 md:pb-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="truncate text-xs uppercase tracking-[0.14em] text-zinc-400">{template.name}</div>
          <div className="flex items-center gap-2">
            <PreviewModeSwitch mode={viewport} onChange={setViewport} iconOnly />
            <Button
              size="icon-sm"
              onClick={onApply}
              onMouseEnter={() => setApplyHovered(true)}
              onMouseLeave={() => setApplyHovered(false)}
              className="rounded-full bg-sky-500 text-zinc-950 hover:bg-sky-400"
              aria-label="Apply"
            >
              <HoverAnimatedIcon icon={CircleCheckIcon} active={applyHovered} size={16} className="h-4 w-4" />
            </Button>
            <Button
              size="icon-sm"
              onClick={onClose}
              onMouseEnter={() => setCloseHovered(true)}
              onMouseLeave={() => setCloseHovered(false)}
              className="rounded-full bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
              aria-label="Close editor"
            >
              <HoverAnimatedIcon icon={XIcon} active={closeHovered} size={16} className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-h-0 rounded-3xl bg-zinc-900/55 p-2">
            <div className="flex h-full min-h-0 items-start justify-center overflow-hidden rounded-2xl bg-zinc-950/85 p-3">
              <DevicePreviewFrame
                template={template}
                data={data}
                viewport={viewport}
                editable
                onFieldChange={(field, value) => setData((prev) => ({ ...prev, [field]: value } as TemplateEditorData))}
              />
            </div>
          </div>

          <div className="flex min-h-0 flex-col rounded-3xl bg-zinc-900/65 p-2.5">
            <div className="mb-2 flex items-center gap-2 text-xs text-zinc-300">
              <SparklesIcon size={14} className="h-3.5 w-3.5 text-sky-300" />
              AI editor chat
            </div>
            <div className="scrollbar-hide min-h-0 flex-1 space-y-2 overflow-y-auto rounded-2xl bg-zinc-950/75 p-2">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[92%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
                    message.role === "assistant" ? "bg-zinc-900 text-zinc-200" : "ml-auto bg-sky-500/20 text-sky-100",
                  )}
                >
                  {message.text}
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-2xl bg-zinc-950/75 p-2">
              <Input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    sendEditorPrompt()
                  }
                }}
                placeholder="Tell AI what to change..."
                className="h-10 rounded-xl border-zinc-700/70 bg-zinc-900 text-zinc-100"
              />
              <Button
                size="icon-sm"
                onClick={sendEditorPrompt}
                disabled={!chatInput.trim()}
                onMouseEnter={() => setSendHovered(true)}
                onMouseLeave={() => setSendHovered(false)}
                className="rounded-xl bg-sky-500 text-zinc-950 hover:bg-sky-400"
                aria-label="Send AI prompt"
              >
                <HoverAnimatedIcon icon={ArrowRightIcon} active={sendHovered} size={16} className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DevicePreviewFrame({
  template,
  data,
  viewport,
  editable = false,
  minimal = false,
  onFieldChange,
}: {
  template: TemplateOption
  data: TemplateEditorData
  viewport: PreviewMode
  editable?: boolean
  minimal?: boolean
  onFieldChange?: (field: EditableTemplateField, value: string) => void
}) {
  const spec = viewportSpecs[viewport]
  const widthCap = viewport === "desktop" ? (editable ? 960 : 760) : viewport === "tablet" ? (editable ? 760 : 620) : 390
  const chromeOffset = minimal ? 118 : editable ? 148 : 210
  const displayWidth = Math.min(spec.width, widthCap)
  const ratio = spec.width / spec.height
  const displayHeight = Math.round(displayWidth / ratio)
  const maxWidthFromViewport = `calc((100vh - ${chromeOffset + 36}px) * ${ratio})`

  return (
    <div className={cn("rounded-[28px] bg-zinc-900/50 p-2 shadow-2xl", minimal ? "p-1.5" : "p-2")}>
      <div
        className="scrollbar-hide overflow-y-auto overflow-x-hidden rounded-[18px] bg-zinc-950/45"
        style={{
          width: `min(${displayWidth}px, calc(100vw - 48px), ${maxWidthFromViewport})`,
          height: `min(${displayHeight}px, calc(100vh - ${chromeOffset}px))`,
        }}
      >
        <TemplateCanvas template={template} data={data} editable={editable} onFieldChange={onFieldChange} />
      </div>
    </div>
  )
}

function TemplateCanvas({
  template,
  data,
  editable = false,
  onFieldChange,
}: {
  template: TemplateOption
  data: TemplateEditorData
  editable?: boolean
  onFieldChange?: (field: EditableTemplateField, value: string) => void
}) {
  const commit = (field: EditableTemplateField, value: string) => {
    if (!onFieldChange) return
    const next = value.trim()
    if (!next) return
    onFieldChange(field, next)
  }

  const handleHeroImageChange = () => {
    if (!editable || !onFieldChange) return
    const next = window.prompt("Hero image URL", data.heroImage)
    if (!next) return
    onFieldChange("heroImage", next)
  }

  return (
    <div className="min-h-full w-full bg-transparent px-1 py-4 sm:px-2">
      <article className="mx-auto w-full max-w-[640px] overflow-hidden rounded-[26px] bg-zinc-50 shadow-[0_18px_45px_rgba(0,0,0,0.24)]">
        <div className="relative h-[290px]">
          <img src={data.heroImage} alt={data.headline} className="h-full w-full object-cover" />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(125deg, ${template.accentA}dd 0%, ${template.accentB}88 52%, #0000006f 100%)`,
            }}
          />

          {editable ? (
            <button
              type="button"
              onClick={handleHeroImageChange}
              className="absolute right-4 top-4 rounded-full bg-black/35 px-3 py-1 text-xs text-white hover:bg-black/55"
            >
              Change hero image
            </button>
          ) : null}

          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <EditableCopy
              value={data.preheader}
              editable={editable}
              onChange={(value) => commit("preheader", value)}
              className="text-xs uppercase tracking-[0.14em] text-white/85"
            />
            <EditableCopy
              tag="h2"
              value={data.headline}
              editable={editable}
              onChange={(value) => commit("headline", value)}
              className="mt-2 text-3xl font-semibold leading-tight"
            />
            <EditableCopy
              value={data.subheadline}
              editable={editable}
              multiline
              onChange={(value) => commit("subheadline", value)}
              className="mt-2 max-w-[560px] text-sm leading-relaxed text-white/90"
            />
          </div>
        </div>

        <div className="space-y-6 px-5 py-6" style={{ backgroundColor: template.surface }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <EditableCopy
                tag="p"
                value={data.restaurantName}
                editable={editable}
                onChange={(value) => commit("restaurantName", value)}
                className="text-xl font-semibold text-zinc-900"
              />
              <EditableCopy
                value={data.subjectLine}
                editable={editable}
                onChange={(value) => commit("subjectLine", value)}
                className="text-sm text-zinc-600"
              />
            </div>
            <Badge className="rounded-full bg-white/80 px-3 py-1 text-[11px] uppercase tracking-wide text-zinc-700">
              {template.theme}
            </Badge>
          </div>

          <div className="rounded-2xl bg-white/75 p-4">
            <EditableCopy
              tag="h3"
              value={data.offerTitle}
              editable={editable}
              onChange={(value) => commit("offerTitle", value)}
              className="text-lg font-semibold text-zinc-900"
            />
            <EditableCopy
              value={data.offerDescription}
              editable={editable}
              multiline
              onChange={(value) => commit("offerDescription", value)}
              className="mt-2 text-sm leading-relaxed text-zinc-600"
            />
            <button
              type="button"
              className="mt-4 inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold"
              style={{ backgroundColor: template.ctaBg, color: template.ctaText }}
            >
              <EditableCopy
                tag="span"
                value={data.ctaText}
                editable={editable}
                onChange={(value) => commit("ctaText", value)}
                className="text-sm"
              />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <DishCard
              image={template.dishOneImage}
              title={data.dishOneTitle}
              description={data.dishOneDescription}
              editable={editable}
              onTitleChange={(value) => commit("dishOneTitle", value)}
              onDescriptionChange={(value) => commit("dishOneDescription", value)}
            />
            <DishCard
              image={template.dishTwoImage}
              title={data.dishTwoTitle}
              description={data.dishTwoDescription}
              editable={editable}
              onTitleChange={(value) => commit("dishTwoTitle", value)}
              onDescriptionChange={(value) => commit("dishTwoDescription", value)}
            />
          </div>

          <div className="rounded-2xl bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Guest experience</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700">
              Expect polished service, chef-led storytelling, and precise pacing from first course to dessert. This template is built to
              convert with premium copy hierarchy and clear booking actions.
            </p>
          </div>
        </div>

        <footer className="bg-white px-5 py-4">
          <EditableCopy
            value={data.footerNote}
            editable={editable}
            multiline
            onChange={(value) => commit("footerNote", value)}
            className="text-xs leading-relaxed text-zinc-500"
          />
        </footer>
      </article>
    </div>
  )
}

function DishCard({
  image,
  title,
  description,
  editable,
  onTitleChange,
  onDescriptionChange,
}: {
  image: string
  title: string
  description: string
  editable: boolean
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white">
      <img src={image} alt={title} className="h-32 w-full object-cover" />
      <div className="space-y-1 p-3">
        <EditableCopy tag="p" value={title} editable={editable} onChange={onTitleChange} className="text-sm font-semibold text-zinc-900" />
        <EditableCopy
          value={description}
          editable={editable}
          multiline
          onChange={onDescriptionChange}
          className="text-xs leading-relaxed text-zinc-600"
        />
      </div>
    </div>
  )
}

function EditableCopy({
  value,
  editable,
  onChange,
  className,
  multiline = false,
  tag = "p",
}: {
  value: string
  editable: boolean
  onChange: (value: string) => void
  className?: string
  multiline?: boolean
  tag?: "p" | "h2" | "h3" | "span"
}) {
  const Tag = tag

  if (!editable) {
    return <Tag className={className}>{value}</Tag>
  }

  return (
    <Tag
      className={cn(
        className,
        "-mx-1 rounded px-1 outline-none focus:bg-black/10 focus:ring-2 focus:ring-sky-500/45",
        multiline ? "whitespace-pre-line" : "whitespace-normal",
      )}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onBlur={(event) => {
        const next = (multiline ? event.currentTarget.innerText : event.currentTarget.textContent)?.trim() ?? ""
        if (!next) {
          event.currentTarget.textContent = value
          return
        }
        if (next !== value) onChange(next)
      }}
      onKeyDown={(event) => {
        if (!multiline && event.key === "Enter") {
          event.preventDefault()
          event.currentTarget.blur()
        }
      }}
    >
      {value}
    </Tag>
  )
}

function ActivityBubble({ label }: { label: string }) {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl bg-zinc-900/90 px-3 py-2 text-xs text-zinc-300 ring-1 ring-zinc-700/70">
        <div className="flex items-center gap-2">
          <SparklesIcon size={14} className="h-3.5 w-3.5 text-sky-300" />
          {label}
          <span className="inline-flex gap-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-300" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-300 [animation-delay:120ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-300 [animation-delay:240ms]" />
          </span>
        </div>
      </div>
    </div>
  )
}

function ValidationTile({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl bg-zinc-900/70 p-2 ring-1 ring-zinc-700/70">
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={cn("text-base font-semibold", tone)}>{value}</p>
    </div>
  )
}

function SentSummaryPage({
  summary,
  selectedTemplate,
  editorData,
}: {
  summary: SendSummary | null
  selectedTemplate: TemplateOption | null
  editorData: TemplateEditorData
}) {
  if (!summary) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-3xl border border-zinc-800/80 bg-zinc-900/65">
        <p className="text-sm text-zinc-400">No sent campaign yet.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <Card className="rounded-3xl border-zinc-800/80 bg-zinc-900/70">
        <CardHeader>
          <CardTitle className="text-zinc-100">Sent summary</CardTitle>
          <CardDescription>Campaign details and performance.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <SummaryRow label="Campaign" value={summary.campaignName} />
          <SummaryRow label="Template" value={summary.templateName} />
          <SummaryRow label="Audience sent" value={`${summary.audienceCount} valid recipients`} />
          <SummaryRow label="Sent at" value={summary.sentAt} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Open Rate" value={summary.openRate} />
        <MetricCard label="Click Rate" value={summary.clickRate} />
        <MetricCard label="Bounce Rate" value={summary.bounceRate} />
      </div>

      <Card className="rounded-3xl border-zinc-800/80 bg-zinc-900/70">
        <CardHeader>
          <CardTitle className="text-zinc-100">Template snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <SummaryRow label="Template" value={selectedTemplate?.name ?? "-"} />
          <SummaryRow label="Headline" value={editorData.headline} />
          <SummaryRow label="CTA" value={editorData.ctaText} />
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-2xl border-zinc-800/80 bg-zinc-900/70 py-4">
      <CardContent className="space-y-1 px-4">
        <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
        <p className="text-2xl font-semibold text-zinc-100">{value}</p>
      </CardContent>
    </Card>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-700/80 bg-zinc-950/80 p-3 text-sm">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-zinc-200">{value}</p>
    </div>
  )
}
