import { Suspense } from "react"

import { PricingPageClient } from "./pricingPageClient"

export default function PricingPage() {
  return (
    <Suspense fallback={null}>
      <PricingPageClient />
    </Suspense>
  )
}
