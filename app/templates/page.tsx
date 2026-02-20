import { Suspense } from "react"

import { TemplatesPageClient } from "./templatesPageClient"

export default function TemplatesPage() {
  return (
    <Suspense fallback={null}>
      <TemplatesPageClient />
    </Suspense>
  )
}
