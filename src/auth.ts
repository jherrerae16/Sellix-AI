// =============================================================
// Sellix AI — Instancia NextAuth.js v5
// =============================================================

import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/authConfig";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  callbacks: {
    ...authConfig.callbacks,
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;

      // Public routes — no auth required at NextAuth level.
      // Cron endpoints validate their own Bearer token internally.
      const publicPaths = [
        "/auth/signin",
        "/api/auth",
        "/api/whatsapp/webhook",
        "/api/classification/process",   // Vercel cron + Bearer
        "/api/actions/prepare",          // Vercel cron + Bearer
        "/welcome",
      ];

      if (publicPaths.some((p) => pathname.startsWith(p))) return true;

      // Root "/" — if not logged in, show landing; if logged in, show dashboard
      if (pathname === "/" && !isLoggedIn) {
        const landingUrl = new URL("/welcome", request.nextUrl.origin);
        return NextResponse.redirect(landingUrl);
      }

      if (isLoggedIn) return true;

      // Everything else requires auth — redirect to login
      return false;
    },
  },
});
