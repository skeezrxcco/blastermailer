import { redirect } from "next/navigation"
import { featureFlags } from "@/lib/feature-flags"

export default function ActivityPage() {
  redirect(featureFlags.campaignsPage ? "/campaigns" : "/chat")
}
