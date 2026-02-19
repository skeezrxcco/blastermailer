import { NextResponse } from "next/server"

import { deleteSession } from "@/lib/auth-store"

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? ""
  const match = cookieHeader.match(/(?:^|; )session-token=([^;]+)/)
  const token = match?.[1]

  deleteSession(token)

  const response = NextResponse.json({ ok: true })
  response.cookies.set({
    name: "session-token",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })

  return response
}
