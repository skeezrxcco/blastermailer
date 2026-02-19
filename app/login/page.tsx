"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { Chrome, Github, Loader2, LogIn } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get("next") || "/chat"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<"google" | "github" | null>(null)

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string }
        throw new Error(payload.error || "Unable to sign in")
      }

      router.push(nextPath)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in")
    } finally {
      setIsLoading(false)
    }
  }

  const signInWithSocial = async (provider: "google" | "github") => {
    setError("")
    setSocialLoading(provider)

    try {
      const response = await fetch("/api/auth/social", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ provider }),
      })

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string }
        throw new Error(payload.error || "Unable to sign in")
      }

      router.push(nextPath)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in")
    } finally {
      setSocialLoading(null)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#1f2937_0%,#0b1120_45%,#030712_100%)] px-4 py-10">
      <Card className="w-full max-w-md border-zinc-800/80 bg-zinc-950/85 text-zinc-100 shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
        <CardHeader>
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>Access your campaign workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-3" onSubmit={signIn}>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
              required
              className="h-11 border-zinc-700 bg-zinc-900 text-zinc-100"
            />
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              required
              className="h-11 border-zinc-700 bg-zinc-900 text-zinc-100"
            />
            <Button type="submit" disabled={isLoading} className="h-11 w-full bg-sky-500 text-zinc-950 hover:bg-sky-400">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Sign in
            </Button>
          </form>

          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
              onClick={() => signInWithSocial("google")}
              disabled={socialLoading !== null}
            >
              {socialLoading === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Chrome className="h-4 w-4" />} Continue with Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
              onClick={() => signInWithSocial("github")}
              disabled={socialLoading !== null}
            >
              {socialLoading === "github" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />} Continue with GitHub
            </Button>
          </div>

          {error ? <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p> : null}

          <p className="text-sm text-zinc-400">
            No account yet?{" "}
            <Link href="/signup" className="font-medium text-sky-300 hover:text-sky-200">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
