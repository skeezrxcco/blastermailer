import { Suspense } from "react"
import { redirect } from "next/navigation"

import { WorkspacePageSkeleton } from "@/components/shared/workspace/workspace-page-skeleton"
import { requirePageUser } from "@/lib/require-page-user"
import { featureFlags } from "@/lib/feature-flags"
import { CampaignsPageClient } from "./campaignsPageClient"

export default async function CampaignsPage() {
  if (!featureFlags.campaignsPage) {
    redirect("/chat")
  }

  const initialUser = await requirePageUser("/campaigns")

  return (
    <Suspense fallback={<WorkspacePageSkeleton title="Loading campaigns workspace..." />}>
      <CampaignsPageClient initialUser={initialUser} />
    </Suspense>
  )
}
