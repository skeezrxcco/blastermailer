import { NextResponse } from "next/server"

import { AuthStoreError, createCredentialUser, createSessionForUser } from "@/lib/auth-store"

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string
      email?: string
      password?: string
    }

    const name = body.name?.trim() ?? ""
    const email = body.email?.trim() ?? ""
    const password = body.password ?? ""

    if (name.length < 2) {
      throw new AuthStoreError("Name must have at least 2 characters", 422)
    }
    if (!isValidEmail(email)) {
      throw new AuthStoreError("Please provide a valid email", 422)
    }
    if (password.length < 8) {
      throw new AuthStoreError("Password must have at least 8 characters", 422)
    }

    const user = createCredentialUser({ name, email, password })
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
    const message = error instanceof Error ? error.message : "Unable to create account"
    const status = error instanceof AuthStoreError ? error.status : 500
    return NextResponse.json({ error: message }, { status })
  }
}
