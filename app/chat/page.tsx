import { Suspense } from "react"

import { ChatPageClient } from "./chatPageClient"

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageClient />
    </Suspense>
  )
}
