import { Suspense } from "react"

import { CheckoutPageClient } from "./checkoutPageClient"

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutPageClient />
    </Suspense>
  )
}
