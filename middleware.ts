import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    // In production, missing/incorrect secret causes token to be null and can create
    // "login works but dashboard redirects back to login" loops.
    secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
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
  const protectedPaths = ["/dashboard", "/start-mock", "/onboarding"];
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));

  if (isProtectedPath && !token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Onboarding enforcement for students
  const isStudent = token?.role === "student";
  const isOnboarded = Boolean((token as any)?.onboardingCompletedAt);

  if (token && isStudent && !isOnboarded) {
    const allowedDuringOnboarding =
      pathname === "/onboarding" ||
      pathname.startsWith("/api/") ||
      pathname.startsWith("/exam");

    if (!allowedDuringOnboarding) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  if (token && isStudent && isOnboarded && pathname === "/onboarding") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
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
