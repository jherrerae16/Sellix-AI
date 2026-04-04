// =============================================================
// Sellix AI — Configuración NextAuth.js v5
// CredentialsProvider + bcrypt + rate limiting + cookies seguras
// JWT expira en 8 horas
// =============================================================

import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { rateLimiter } from "./rateLimiter";
import { logAuthEvent } from "./logger";

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "Credenciales",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials, request) {
        const username = credentials?.username as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!username || !password) {
          logAuthEvent("auth_failure", { reason: "empty_credentials" });
          return null;
        }

        // Rate limiting by IP
        const ip = (request as Request)?.headers?.get?.("x-forwarded-for") ?? "unknown";
        if (!rateLimiter.check(ip)) {
          logAuthEvent("auth_blocked", { username, ip });
          return null;
        }

        // Validate against environment variables
        const validUser = process.env.APP_USER;
        const validHash = process.env.APP_PASSWORD_HASH;

        if (!validUser || !validHash) {
          logAuthEvent("auth_config_missing", { reason: "APP_USER or APP_PASSWORD_HASH not set" });
          return null;
        }

        if (username !== validUser) {
          logAuthEvent("auth_failure", { reason: "invalid_user" });
          return null;
        }

        const isValid = await bcrypt.compare(password, validHash);

        if (!isValid) {
          logAuthEvent("auth_failure", { reason: "invalid_password" });
          return null;
        }

        logAuthEvent("auth_success", { username });
        return { id: "1", name: username };
      },
    }),
  ],

  pages: {
    signIn: "/auth/signin",
  },

  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 horas
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },

  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
};
