// =============================================================
// Sellix AI — Instancia NextAuth.js v5
// Exporta handlers, auth, signIn, signOut para toda la app
// =============================================================

import NextAuth from "next-auth";
import { authConfig } from "@/lib/authConfig";

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
