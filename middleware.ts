import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const protectedPrefixes = ["/chat", "/templates", "/contacts", "/sent", "/settings", "/pricing", "/checkout"]
const authPages = ["/login", "/signup"]

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const token = request.cookies.get("session-token")?.value

  if (!token && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  if (token && authPages.includes(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/chat"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/chat/:path*",
    "/templates/:path*",
    "/contacts/:path*",
    "/sent/:path*",
    "/settings/:path*",
    "/pricing/:path*",
    "/checkout/:path*",
    "/login",
    "/signup",
  ],
}
