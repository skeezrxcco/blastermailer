import { Suspense } from "react"

import { SettingsPageClient } from "./settingsPageClient"

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsPageClient />
    </Suspense>
  )
}
