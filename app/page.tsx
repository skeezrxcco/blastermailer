import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function Home() {
  const sessionToken = (await cookies()).get("session-token")?.value
  redirect(sessionToken ? "/chat" : "/login")
}
