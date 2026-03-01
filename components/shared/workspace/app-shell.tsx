"use client"

import { type ComponentType, type ReactNode, useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BotIcon } from "@/components/ui/bot"
import { CircleCheckIcon } from "@/components/ui/circle-check"
import { FilePenLineIcon } from "@/components/ui/file-pen-line"
import { FileTextIcon } from "@/components/ui/file-text"
import { HandCoinsIcon } from "@/components/ui/hand-coins"
import { IdCardIcon } from "@/components/ui/id-card"
import { MenuIcon } from "@/components/ui/menu"
import { PanelLeftCloseIcon } from "@/components/ui/panel-left-close"
import { PanelLeftOpenIcon } from "@/components/ui/panel-left-open"
import { PartyPopperIcon } from "@/components/ui/party-popper"
import { RocketIcon } from "@/components/ui/rocket"
import { SparklesIcon } from "@/components/ui/sparkles"
import { UsersIcon } from "@/components/ui/users"
import {
  settingsSectionFromParam,
  settingsSidebarItems,
  sidebarItems,
  workspaceStaticData,
  type SettingsSection,
  type WorkspaceIconKey,
} from "@/components/shared/workspace/workspace.data"
import { useAiCredits } from "@/hooks/use-ai-credits"
import { useCheckoutItem } from "@/hooks/use-checkout-item"
import { useSessionUser } from "@/hooks/use-session-user"
import { tabRoutes, type SidebarTab } from "@/hooks/use-workspace-tab"
import { type SessionUserSummary } from "@/types/session-user"
import { cn } from "@/lib/utils"

type AppIcon = ComponentType<{ className?: string; size?: number }>
type IconAnimationHandle = { startAnimation: () => void; stopAnimation: () => void }

type NavigationItem = {
  id: string
  label: string
  icon: AppIcon
  active: boolean
  indicator?: string
  onSelect: () => void
}

const iconByKey: Record<WorkspaceIconKey, AppIcon> = {
  bot: BotIcon,
  filePenLine: FilePenLineIcon,
  fileText: FileTextIcon,
  users: UsersIcon,
  rocket: RocketIcon,
  sparkles: SparklesIcon,
  circleCheck: CircleCheckIcon,
  partyPopper: PartyPopperIcon,
  handCoins: HandCoinsIcon,
  idCard: IdCardIcon,
}

type ChatHistoryItem = {
  conversationId: string
  state?: string
  summary?: string | null
  context?: {
    goal?: string
  } | null
}

const CHAT_HISTORY_PAGE_SIZE = 10
const CHAT_DRAFT_STORAGE_PREFIX = "bm:chat:draft:"

function chatHistoryTitle(item: ChatHistoryItem, index: number) {
  const goal = item.context?.goal?.trim()
  if (goal) return goal.slice(0, 42)
  const summary = item.summary?.replace(/\s+/g, " ").trim()
  if (summary) return summary.slice(0, 42)
  return `Chat ${index + 1}`
}

function clearConversationDraft(conversationId: string) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(`${CHAT_DRAFT_STORAGE_PREFIX}${conversationId}`)
  } catch {
    // Ignore draft cleanup failures.
  }
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
      iconRef.current?.startAnimation?.()
      return
    }
    iconRef.current?.stopAnimation?.()
  }, [active])

  const IconComponent = Icon as unknown as ComponentType<any>

  return <IconComponent ref={iconRef} size={size} className={cn("inline-flex items-center justify-center", className)} />
}

function QuotaMeter({
  quotaPercent,
  isPaid,
  onUpgrade,
  compact,
}: {
  quotaPercent: number
  isPaid: boolean
  onUpgrade?: () => void
  compact?: boolean
}) {
  const barColor =
    quotaPercent > 40
      ? "bg-gradient-to-r from-emerald-400 to-sky-400"
      : quotaPercent > 15
        ? "bg-gradient-to-r from-amber-300 to-amber-400"
        : "bg-gradient-to-r from-rose-400 to-rose-500"

  if (compact) {
    return (
      <div className="w-full px-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-zinc-400">Usage</span>
          <span className={cn("text-[11px] font-semibold tabular-nums", quotaPercent > 15 ? "text-zinc-300" : "text-rose-300")}>
            {quotaPercent}%
          </span>
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-zinc-800">
          <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${quotaPercent}%` }} />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-zinc-900/70 px-3 py-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-zinc-400">Usage</span>
        <span className={cn("text-[11px] font-semibold tabular-nums", quotaPercent > 15 ? "text-zinc-300" : "text-rose-300")}>
          {quotaPercent}%
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${quotaPercent}%` }} />
      </div>
      {!isPaid ? (
        <div className="mt-2 flex justify-start">
          <button
            type="button"
            onClick={onUpgrade}
            className="inline-flex h-6 items-center justify-center rounded-full border border-zinc-700/80 bg-zinc-900/70 px-2.5 text-[10px] font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
          >
            Upgrade to Pro
          </button>
        </div>
      ) : null}
    </div>
  )
}

function accountTypeLabel(plan: string) {
  const normalized = String(plan ?? "")
    .trim()
    .toLowerCase()
  if (normalized === "premium") return "Premium"
  if (normalized === "pro") return "Pro"
  return "Free"
}

function isProPlan(plan: string) {
  const normalized = String(plan ?? "")
    .trim()
    .toLowerCase()
  return normalized === "pro" || normalized === "premium" || normalized === "enterprise"
}

function UserMenu({
  user,
  isPro,
  sidebarExpanded,
  quotaPercent,
  activeModelLabel,
  onNavigateSettingsSection,
  onUpgrade,
  onSignOut,
}: {
  user: SessionUserSummary
  isPro: boolean
  sidebarExpanded: boolean
  quotaPercent: number
  activeModelLabel?: string
  onNavigateSettingsSection: (section: SettingsSection) => void
  onUpgrade: () => void
  onSignOut: () => void
}) {
  const planBadgeColor = isPro
    ? "bg-sky-500/20 text-sky-300"
    : "bg-zinc-800 text-zinc-400"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "transition",
            sidebarExpanded
              ? "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-zinc-900/80"
              : "rounded-full p-0.5",
          )}
          aria-label="Open user menu"
        >
          <Avatar className="size-7 shrink-0 rounded-full!">
            <AvatarImage src={user.avatarUrl ?? undefined} alt="User avatar" />
            <AvatarFallback className="bg-zinc-800 text-xs text-zinc-300">{user.initials}</AvatarFallback>
          </Avatar>
          {sidebarExpanded ? (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-medium leading-tight text-zinc-200">{user.name}</span>
              <span className={cn("mt-0.5 inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-semibold leading-none", planBadgeColor)}>
                {accountTypeLabel(user.plan)}
              </span>
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60 border-zinc-700 bg-zinc-950 text-zinc-100" align={sidebarExpanded ? "start" : "end"} side="top" sideOffset={8}>
        <DropdownMenuLabel className="py-2">
          <div className="flex items-center gap-2">
            <Avatar className="size-8 shrink-0 rounded-full!">
              <AvatarImage src={user.avatarUrl ?? undefined} alt="User avatar" />
              <AvatarFallback className="bg-zinc-800 text-xs text-zinc-300">{user.initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-zinc-100">{user.name}</p>
              <span className={cn("mt-0.5 inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-semibold leading-none", planBadgeColor)}>
                {accountTypeLabel(user.plan)}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <div className="px-2 py-1.5">
          <QuotaMeter quotaPercent={quotaPercent} isPaid={isPro} compact />
          {activeModelLabel ? (
            <p className="mt-1.5 px-1 text-[10px] text-zinc-500">Model: <span className="text-zinc-400">{activeModelLabel}</span></p>
          ) : null}
        </div>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem className="rounded-sm py-1.5 text-[12px] focus:bg-zinc-800/40" onClick={() => onNavigateSettingsSection("profile")}>
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem className="rounded-sm py-1.5 text-[12px] focus:bg-zinc-800/40" onClick={() => onNavigateSettingsSection("plan")}>
          Plan
        </DropdownMenuItem>
        <DropdownMenuItem className="rounded-sm py-1.5 text-[12px] focus:bg-zinc-800/40" onClick={() => onNavigateSettingsSection("referals")}>
          Referals
        </DropdownMenuItem>
        {!isPro ? (
          <DropdownMenuItem className="rounded-sm py-1.5 text-[12px] text-cyan-300 focus:bg-zinc-800/40 focus:text-cyan-200" onClick={onUpgrade}>
            Upgrade to Pro
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem className="rounded-sm py-1.5 text-[12px] focus:bg-zinc-800/40" onClick={onSignOut}>
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
        "group relative flex rounded-sm text-sm transition",
        sidebarExpanded ? "w-full items-center gap-3 px-3 py-2.5 text-left" : "size-10 items-center justify-center p-0",
        item.active ? "bg-zinc-800/85 text-zinc-100" : "text-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-100",
      )}
    >
      <HoverAnimatedIcon icon={item.icon} active={hovered || item.active} size={18} className="h-[18px] w-[18px] shrink-0" />
      <span
        className={cn(
          "inline-flex items-center gap-2 overflow-hidden whitespace-nowrap transition-all duration-200",
          sidebarExpanded ? "max-w-[160px] opacity-100" : "max-w-0 opacity-0",
        )}
      >
        {item.label}
        {item.indicator ? <span className="rounded-full bg-emerald-300 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-900">{item.indicator}</span> : null}
      </span>
      {!sidebarExpanded && item.indicator ? <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-300" /> : null}
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
        "group flex w-full items-center gap-2 rounded-sm px-3 py-2.5 text-sm transition",
        item.active ? "bg-zinc-800/85 text-zinc-100" : "text-zinc-300 hover:bg-zinc-900/70 hover:text-zinc-100",
      )}
    >
      <HoverAnimatedIcon icon={item.icon} active={hovered || item.active} size={16} className="h-4 w-4" />
      <span className="inline-flex items-center gap-2">
        {item.label}
        {item.indicator ? <span className="rounded-full bg-emerald-300 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-900">{item.indicator}</span> : null}
      </span>
    </button>
  )
}

export function WorkspaceShell({
  tab,
  children,
  pageTitle: _pageTitle,
  user,
  activeModelLabel,
}: {
  tab: SidebarTab
  children: ReactNode
  pageTitle?: string
  user?: SessionUserSummary
  activeModelLabel?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { hasCheckoutItem } = useCheckoutItem()

  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarToggleHovered, setSidebarToggleHovered] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([])
  const [isChatHistoryLoading, setIsChatHistoryLoading] = useState(false)
  const [isChatHistoryLoadingMore, setIsChatHistoryLoadingMore] = useState(false)
  const [chatHistoryHasMore, setChatHistoryHasMore] = useState(false)
  const [chatHistoryNextOffset, setChatHistoryNextOffset] = useState(0)
  const [chatHistoryCollapsed, setChatHistoryCollapsed] = useState(false)
  const [mobileChatHistoryCollapsed, setMobileChatHistoryCollapsed] = useState(false)

  const sessionUser = useSessionUser(
    user ?? {
      name: workspaceStaticData.user.name,
      email: workspaceStaticData.user.email,
      plan: workspaceStaticData.user.plan,
      initials: workspaceStaticData.user.initials,
      avatarUrl: workspaceStaticData.user.avatarUrl,
    },
  )
  const aiQuota = useAiCredits()

  const isPaidUser = isProPlan(sessionUser.plan)

  const isSettingsSuiteRoute = tab === "settings" || tab === "pricing" || tab === "checkout"
  const activeSettingsSection = settingsSectionFromParam(searchParams.get("section"))
  const activeConversationId = searchParams.get("conversationId")

  const fetchChatHistoryPage = useCallback(async (offset: number) => {
    const response = await fetch(
      `/api/ai/session?sessionsLimit=${CHAT_HISTORY_PAGE_SIZE}&sessionsOffset=${Math.max(offset, 0)}`,
      {
        method: "GET",
        cache: "no-store",
      },
    )
    if (!response.ok) return null
    return (await response.json()) as {
      sessions?: ChatHistoryItem[]
      sessionsMeta?: {
        nextOffset?: number
        hasMore?: boolean
      }
    }
  }, [])

  const refreshChatHistory = useCallback(async () => {
    if (isSettingsSuiteRoute) return
    try {
      setIsChatHistoryLoading(true)
      const payload = await fetchChatHistoryPage(0)
      if (!payload) return
      const sessions = payload.sessions ?? []
      setChatHistory(sessions)
      setChatHistoryHasMore(Boolean(payload.sessionsMeta?.hasMore))
      setChatHistoryNextOffset(payload.sessionsMeta?.nextOffset ?? sessions.length)
    } catch {
      // Ignore history refresh failures.
    } finally {
      setIsChatHistoryLoading(false)
      setIsChatHistoryLoadingMore(false)
    }
  }, [fetchChatHistoryPage, isSettingsSuiteRoute])

  const loadMoreChatHistory = useCallback(async () => {
    if (isSettingsSuiteRoute) return
    if (isChatHistoryLoading || isChatHistoryLoadingMore || !chatHistoryHasMore) return
    try {
      setIsChatHistoryLoadingMore(true)
      const payload = await fetchChatHistoryPage(chatHistoryNextOffset)
      if (!payload) return
      const sessions = payload.sessions ?? []
      setChatHistory((prev) => {
        const known = new Set(prev.map((entry) => entry.conversationId))
        const incoming = sessions.filter((entry) => !known.has(entry.conversationId))
        return [...prev, ...incoming]
      })
      setChatHistoryHasMore(Boolean(payload.sessionsMeta?.hasMore))
      setChatHistoryNextOffset(payload.sessionsMeta?.nextOffset ?? chatHistoryNextOffset + sessions.length)
    } catch {
      // Ignore history pagination failures.
    } finally {
      setIsChatHistoryLoadingMore(false)
    }
  }, [chatHistoryHasMore, chatHistoryNextOffset, fetchChatHistoryPage, isChatHistoryLoading, isChatHistoryLoadingMore, isSettingsSuiteRoute])

  useEffect(() => {
    if (isSettingsSuiteRoute) return
    let cancelled = false

    const runRefresh = async () => {
      if (cancelled) return
      await refreshChatHistory()
    }

    void runRefresh()
    const interval = window.setInterval(runRefresh, 45_000)

    const onRefreshEvent = () => { void runRefresh() }
    window.addEventListener("bm:chat-history-refresh", onRefreshEvent)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener("bm:chat-history-refresh", onRefreshEvent)
    }
  }, [isSettingsSuiteRoute, refreshChatHistory])

  const navigateToTab = (nextTab: SidebarTab) => {
    router.push(tabRoutes[nextTab])
    setMobileMenuOpen(false)
  }

  const navigateToSettingsSection = (section: SettingsSection) => {
    router.push(`/settings?section=${section}`)
    setMobileMenuOpen(false)
  }

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  const navigationItems: NavigationItem[] = isSettingsSuiteRoute
    ? settingsSidebarItems
        .filter((item) => item.id !== "checkout" || hasCheckoutItem)
        .map((item) => ({
          id: item.id,
          label: item.label,
          icon: iconByKey[item.icon],
          indicator: item.id === "checkout" && hasCheckoutItem ? "1" : undefined,
          active:
            item.id === "pricing" || item.id === "checkout"
              ? tab === item.id
              : tab === "settings" && activeSettingsSection === item.id,
          onSelect: () => {
            if (item.id === "pricing" || item.id === "checkout") {
              navigateToTab(item.id)
              return
            }
            navigateToSettingsSection(item.id)
          },
        }))
    : sidebarItems
        .map((item) => ({
          id: item.id,
          label: item.label,
          icon: iconByKey[item.icon],
          indicator: item.id === "campaigns" && !isPaidUser ? "PRO" : undefined,
          active: item.id === "chat" ? false : tab === item.id,
          onSelect: () => {
            if (item.id === "chat") {
              router.push("/chat?newChat=1")
              setMobileMenuOpen(false)
              return
            }
            navigateToTab(item.id)
          },
        }))

  const drawerDescription = isSettingsSuiteRoute ? workspaceStaticData.settingsDrawerDescription : workspaceStaticData.workspaceDrawerDescription

  return (
    <main className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#1f2937_0%,#09090b_42%,#030712_100%)] text-zinc-100">
      <div className="h-full p-0">
        <div className="flex h-full overflow-hidden bg-zinc-950/80 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <aside
            className={cn(
              "hidden h-full shrink-0 flex-col overflow-hidden border-r border-zinc-800/90 bg-zinc-950/92 p-3 transition-[width] duration-300 ease-in-out lg:flex",
              sidebarExpanded ? "lg:w-60" : "lg:w-20",
            )}
          >
            <div className={cn("mb-3 flex items-center gap-2", sidebarExpanded ? "justify-between" : "justify-center")}>
              {sidebarExpanded ? (
                <button
                  type="button"
                  onClick={() => {
                    router.push("/")
                  }}
                  className="inline-flex min-w-0 items-center gap-2 rounded-sm px-1 py-1 text-left transition hover:bg-zinc-900/70"
                  aria-label="Go to home"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-gradient-to-br from-sky-500 to-cyan-400 text-[11px] font-bold text-zinc-950">
                    B
                  </span>
                  <span className="truncate text-[14px] font-semibold text-zinc-200">{workspaceStaticData.expandedTitle}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    router.push("/")
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-sm transition hover:bg-zinc-900/70"
                  aria-label="Go to home"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-gradient-to-br from-sky-500 to-cyan-400 text-[11px] font-bold text-zinc-950">
                    B
                  </span>
                </button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarExpanded((prev) => !prev)}
                onMouseEnter={() => setSidebarToggleHovered(true)}
                onMouseLeave={() => setSidebarToggleHovered(false)}
                className="size-9 rounded-full p-0 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              >
                {sidebarExpanded ? (
                  <HoverAnimatedIcon icon={PanelLeftCloseIcon} active={sidebarToggleHovered} size={16} className="h-4 w-4" />
                ) : (
                  <HoverAnimatedIcon icon={PanelLeftOpenIcon} active={sidebarToggleHovered} size={16} className="h-4 w-4" />
                )}
              </Button>
            </div>

            <nav className={cn("space-y-1.5", sidebarExpanded ? "" : "flex flex-col items-center")}>
              {navigationItems.map((item) => (
                <SidebarNavigationButton key={item.id} item={item} sidebarExpanded={sidebarExpanded} />
              ))}
            </nav>

            {!isSettingsSuiteRoute && sidebarExpanded ? (
              <div className="mt-3 flex min-h-0 flex-1 flex-col">
                <button
                  type="button"
                  onClick={() => setChatHistoryCollapsed((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-sm px-2 py-2 text-left text-sm font-medium text-zinc-500 transition hover:text-zinc-300"
                >
                  <span>Your chats</span>
                  {chatHistoryCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {!chatHistoryCollapsed ? (
                  <div className="scrollbar-hide mt-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
                    {chatHistory.length ? (
                      <>
                        {chatHistory.map((item, index) => {
                          const isActive = tab === "chat" && activeConversationId === item.conversationId
                          return (
                            <div key={item.conversationId} className="group relative animate-in fade-in slide-in-from-left-2 duration-300">
                              <button
                                type="button"
                                onClick={() => {
                                  router.push(`/chat?conversationId=${encodeURIComponent(item.conversationId)}`)
                                }}
                                className={cn(
                                  "w-full rounded-sm px-2.5 py-1.5 text-left transition",
                                  isActive ? "bg-zinc-800/80 text-zinc-100" : "text-zinc-500 hover:bg-zinc-900/70 hover:text-zinc-200",
                                )}
                              >
                                <p className="truncate pr-6 text-[12px] font-medium leading-5">{chatHistoryTitle(item, index)}</p>
                              </button>
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  if (!confirm("Delete this conversation?")) return
                                  try {
                                    clearConversationDraft(item.conversationId)
                                    const response = await fetch(`/api/ai/session?conversationId=${encodeURIComponent(item.conversationId)}`, {
                                      method: "DELETE",
                                    })
                                    if (response.ok) {
                                      await refreshChatHistory()
                                      if (isActive) {
                                        router.push("/chat?newChat=1")
                                      }
                                    }
                                  } catch {
                                    // Ignore deletion failures
                                  }
                                }}
                                className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-600 opacity-0 transition hover:bg-zinc-800 hover:text-red-400 group-hover:opacity-100"
                                aria-label="Delete conversation"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )
                        })}
                        {chatHistoryHasMore ? (
                          <button
                            type="button"
                            onClick={() => { void loadMoreChatHistory() }}
                            disabled={isChatHistoryLoadingMore || isChatHistoryLoading}
                            className="w-full rounded-sm px-2.5 py-1.5 text-left text-[11px] text-zinc-500 transition hover:bg-zinc-900/70 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isChatHistoryLoadingMore ? "Loading..." : "See more"}
                          </button>
                        ) : null}
                      </>
                    ) : (
                      <p className="px-2.5 py-1.5 text-[12px] text-zinc-600">{isChatHistoryLoading ? "Loading..." : "No chats yet"}</p>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className={cn("mt-auto", sidebarExpanded ? "pt-4" : "flex flex-col items-center pt-3")}>
              <UserMenu
                user={sessionUser}
                isPro={isPaidUser}
                sidebarExpanded={sidebarExpanded}
                quotaPercent={aiQuota.quotaPercent}
                activeModelLabel={activeModelLabel}
                onNavigateSettingsSection={navigateToSettingsSection}
                onUpgrade={() => navigateToTab("pricing")}
                onSignOut={handleSignOut}
              />
            </div>
          </aside>

          <section className="flex min-h-0 min-w-0 flex-1 flex-col p-3 sm:p-4 lg:p-5">
            <div className="mb-1 flex h-9 items-center lg:hidden">
              <Drawer direction="left" open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <DrawerTrigger asChild>
                  <Button variant="outline" size="icon-sm" className="border-zinc-700 bg-zinc-950 text-zinc-100 hover:bg-zinc-800">
                    <MenuIcon size={16} className="h-4 w-4" />
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
                  <DrawerHeader>
                    <DrawerTitle>{workspaceStaticData.drawerNavigationTitle}</DrawerTitle>
                    <DrawerDescription>{drawerDescription}</DrawerDescription>
                  </DrawerHeader>
                  <div className="space-y-2 px-4 pb-4">
                    <QuotaMeter quotaPercent={aiQuota.quotaPercent} isPaid={isPaidUser} onUpgrade={() => navigateToTab("pricing")} />
                    {navigationItems.map((item) => (
                      <DrawerNavigationButton key={item.id} item={item} />
                    ))}
                    {!isSettingsSuiteRoute ? (
                      <div>
                        <button
                          type="button"
                          onClick={() => setMobileChatHistoryCollapsed((prev) => !prev)}
                          className="flex w-full items-center justify-between rounded-sm px-2 py-2 text-left text-[14px] font-medium text-zinc-500 transition hover:text-zinc-300"
                        >
                          <span>Your chats</span>
                          {mobileChatHistoryCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                        {!mobileChatHistoryCollapsed ? (
                          <div className="scrollbar-hide mt-1 max-h-[52vh] space-y-0.5 overflow-y-auto pr-1">
                            {chatHistory.length ? (
                              <>
                                {chatHistory.map((item, index) => (
                                  <button
                                    key={item.conversationId}
                                    type="button"
                                    onClick={() => {
                                      router.push(`/chat?conversationId=${encodeURIComponent(item.conversationId)}`)
                                      setMobileMenuOpen(false)
                                    }}
                                    className={cn(
                                      "w-full rounded-sm px-2.5 py-1.5 text-left transition",
                                      tab === "chat" && activeConversationId === item.conversationId
                                        ? "bg-zinc-800/80 text-zinc-100"
                                        : "text-zinc-500 hover:bg-zinc-900/70 hover:text-zinc-200",
                                    )}
                                  >
                                    <p className="truncate text-[12px] font-medium leading-5">{chatHistoryTitle(item, index)}</p>
                                  </button>
                                ))}
                                {chatHistoryHasMore ? (
                                  <button
                                    type="button"
                                    onClick={() => { void loadMoreChatHistory() }}
                                    disabled={isChatHistoryLoadingMore || isChatHistoryLoading}
                                    className="w-full rounded-sm px-2.5 py-1.5 text-left text-[11px] text-zinc-500 transition hover:bg-zinc-900/70 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {isChatHistoryLoadingMore ? "Loading..." : "See more"}
                                  </button>
                                ) : null}
                              </>
                            ) : (
                              <p className="px-2.5 py-1.5 text-[11px] text-zinc-600">{isChatHistoryLoading ? "Loading..." : "No chats yet"}</p>
                            )}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    <Button variant="outline" className="mt-2 w-full border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800" onClick={handleSignOut}>
                      Logout
                    </Button>
                  </div>
                </DrawerContent>
              </Drawer>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              {children}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
