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
      const isLoggedIn = !!auth?.user;
      const isOnSignIn = request.nextUrl.pathname.startsWith("/auth/signin");
      const isAuthApi = request.nextUrl.pathname.startsWith("/api/auth");

      if (isAuthApi || isOnSignIn) return true;
      if (isLoggedIn) return true;

      // Redirect to login
      return false;
    },
  },
});
