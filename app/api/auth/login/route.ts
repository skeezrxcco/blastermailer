import { NextResponse } from "next/server"

import { AuthStoreError, createSessionForUser, loginWithCredentials } from "@/lib/auth-store"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string
      password?: string
    }

    const email = body.email?.trim() ?? ""
    const password = body.password ?? ""

    if (!email || !password) {
      throw new AuthStoreError("Email and password are required", 422)
    }

    const user = loginWithCredentials({ email, password })
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
    const message = error instanceof Error ? error.message : "Unable to sign in"
    const status = error instanceof AuthStoreError ? error.status : 500
    return NextResponse.json({ error: message }, { status })
  }
}
