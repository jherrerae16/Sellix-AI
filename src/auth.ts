// =============================================================
// Sellix AI — Instancia NextAuth.js v5
// =============================================================

import NextAuth from "next-auth";
import { authConfig } from "@/lib/authConfig";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  callbacks: {
    ...authConfig.callbacks,
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;

      // Public routes — no auth required
      const publicPaths = [
        "/auth/signin",
        "/api/auth",
        "/api/whatsapp/webhook",  // Twilio sends POST here without auth
      ];

      if (publicPaths.some((p) => pathname.startsWith(p))) return true;
      if (isLoggedIn) return true;

      // Redirect to login
      return false;
    },
  },
});
