import { Suspense } from "react"

import { ContactsPageClient } from "./contactsPageClient"

export default function ContactsPage() {
  return (
    <Suspense fallback={null}>
      <ContactsPageClient />
    </Suspense>
  )
}
