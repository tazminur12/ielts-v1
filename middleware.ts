import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPathExact = ["/", "/pricing", "/about", "/login", "/signup"];
  const publicPathPrefixes = ["/api/auth"];

  const isPublicPath =
    publicPathExact.includes(pathname) ||
    publicPathPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (isPublicPath) return NextResponse.next();

  // Free trial exam routes (guest allowed). Actual access is enforced by API.
  if (pathname === "/exam" || pathname.startsWith("/exam/")) {
    return NextResponse.next();
  }

  // Protected routes - require authentication
  const protectedPaths = ["/dashboard", "/start-mock"];
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));

  if (isProtectedPath && !token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Admin routes - require admin role
  if (pathname.startsWith("/dashboard/admin")) {
    if (!token || !["super-admin", "admin"].includes(token.role as string)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
