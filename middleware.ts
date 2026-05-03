import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const requestId =
    request.headers.get("x-request-id") ||
    ((globalThis as any).crypto?.randomUUID ? (globalThis as any).crypto.randomUUID() : String(Date.now()));
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  const token = await getToken({
    req: request,
    // In production, missing/incorrect secret causes token to be null and can create
    // "login works but dashboard redirects back to login" loops.
    secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  });

  const { pathname } = request.nextUrl;

  const next = () => {
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set("x-request-id", requestId);
    return res;
  };

  const redirect = (url: URL) => {
    const res = NextResponse.redirect(url);
    res.headers.set("x-request-id", requestId);
    return res;
  };

  // Public paths that don't require authentication
  const publicPathExact = ["/", "/pricing", "/about", "/login", "/signup"];
  const publicPathPrefixes = ["/api/auth"];

  const isPublicPath =
    publicPathExact.includes(pathname) ||
    publicPathPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (isPublicPath) return next();

  // Free trial exam routes (guest allowed). Actual access is enforced by API.
  if (pathname === "/exam" || pathname.startsWith("/exam/")) {
    return next();
  }

  // Protected routes - require authentication
  const protectedPaths = ["/dashboard", "/start-mock", "/onboarding"];
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));

  if (isProtectedPath && !token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    return redirect(url);
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
      return redirect(new URL("/onboarding", request.url));
    }
  }

  if (token && isStudent && isOnboarded && pathname === "/onboarding") {
    return redirect(new URL("/dashboard", request.url));
  }

  // Admin routes - require admin role
  if (pathname.startsWith("/dashboard/admin")) {
    if (!token || !["super-admin", "admin"].includes(token.role as string)) {
      return redirect(new URL("/dashboard", request.url));
    }
  }

  return next();
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
