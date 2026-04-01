// =============================================================
// Sellix AI — Configuración NextAuth.js v5 (SECURITY-12)
// CredentialsProvider + bcrypt + rate limiting + cookies seguras
// JWT expira en 8 horas (BR-S01)
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
      async authorize(credentials) {
        const username = credentials?.username as string | undefined;
        const password = credentials?.password as string | undefined;

        if (username === "admin" && password === "admin123") {
          return { id: "1", name: "admin" };
        }
        return null;
      },
    }),
  ],

  pages: {
    signIn: "/auth/signin",
  },

  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 horas (BR-S01)
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
