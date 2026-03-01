import { useMemo } from "react"
import { usePathname } from "next/navigation"
import { featureFlags } from "@/lib/feature-flags"

export type SidebarTab = "chat" | "templates" | "contacts" | "activity" | "campaigns" | "settings" | "pricing" | "checkout"

export const tabRoutes: Record<SidebarTab, string> = {
  chat: "/chat",
  templates: "/templates",
  contacts: "/contacts",
  activity: "/activity",
  campaigns: featureFlags.campaignsPage ? "/campaigns" : "/chat",
  settings: "/settings",
  pricing: "/pricing",
  checkout: "/checkout",
}

export function tabFromPathname(pathname: string): SidebarTab {
  if (pathname.startsWith("/templates")) return "templates"
  if (pathname.startsWith("/contacts")) return "contacts"
  if (pathname.startsWith("/activity")) return "activity"
  if (pathname.startsWith("/campaigns")) return featureFlags.campaignsPage ? "campaigns" : "chat"
  if (pathname.startsWith("/settings")) return "settings"
  if (pathname.startsWith("/pricing")) return "pricing"
  if (pathname.startsWith("/checkout")) return "checkout"
  return "chat"
}

export function useWorkspaceTab() {
  const pathname = usePathname()

  return useMemo(() => tabFromPathname(pathname), [pathname])
}
