import { NextResponse } from "next/server"

import { AuthStoreError, createSessionForUser, loginWithSocial } from "@/lib/auth-store"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      provider?: string
    }

    const provider = body.provider
    if (provider !== "google" && provider !== "github") {
      throw new AuthStoreError("Unsupported social provider", 422)
    }

    const user = loginWithSocial(provider)
    const token = createSessionForUser(user.id)

    const response = NextResponse.json({ user })
    response.cookies.set({
      name: "session-token",
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sign in with social provider"
    const status = error instanceof AuthStoreError ? error.status : 500
    return NextResponse.json({ error: message }, { status })
  }
}
