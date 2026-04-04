// =============================================================
// Sellix AI — Auth Middleware (Edge Runtime)
// Protege todas las rutas excepto login, API de auth, y assets
// =============================================================

import { auth } from "./auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow public paths
  const publicPaths = [
    "/auth/signin",
    "/api/auth",
    "/_next",
    "/favicon.ico",
  ];

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // If not authenticated, redirect to login
  if (!req.auth) {
    const signInUrl = new URL("/auth/signin", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Protect everything except static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
