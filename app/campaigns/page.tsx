import { Suspense } from "react"

import { CampaignsPageClient } from "./campaignsPageClient"

export default function CampaignsPage() {
  return (
    <Suspense fallback={null}>
      <CampaignsPageClient />
    </Suspense>
  )
}
