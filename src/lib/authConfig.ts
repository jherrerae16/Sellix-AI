// =============================================================
// Sellix AI — Configuración NextAuth.js v5
// Compatible con Vercel Edge Runtime
// =============================================================

import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

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

        if (!username || !password) return null;

        const validUser = process.env.APP_USER;
        const validPassword = process.env.APP_PASSWORD;

        if (!validUser || !validPassword) {
          console.error("AUTH: APP_USER or APP_PASSWORD not configured");
          return null;
        }

        if (username === validUser && password === validPassword) {
          return { id: "1", name: username };
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
    maxAge: 8 * 60 * 60,
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
};
