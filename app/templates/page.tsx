import { Suspense } from "react"
import { redirect } from "next/navigation"

import { WorkspacePageSkeleton } from "@/components/shared/workspace/workspace-page-skeleton"
import { featureFlags } from "@/lib/feature-flags"
import { requirePageUser } from "@/lib/require-page-user"
import { TemplatesPageClient } from "./templatesPageClient"

export default async function TemplatesPage() {
  if (!featureFlags.templatesPage) {
    redirect("/chat")
  }

  const initialUser = await requirePageUser("/templates")

  return (
    <Suspense fallback={<WorkspacePageSkeleton title="Loading template marketplace..." />}>
      <TemplatesPageClient initialUser={initialUser} />
    </Suspense>
  )
}
