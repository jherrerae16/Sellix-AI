// =============================================================
// Sellix AI — Instancia NextAuth con provider de base de datos
//
// Solo para Node runtime. La importa el route handler de NextAuth,
// que es donde ocurre el login real (verificación de contraseña
// contra la tabla `users`).
//
// El middleware usa la instancia Edge-safe de src/auth.ts, que
// comparte la misma configuración de JWT y por tanto lee y verifica
// los mismos tokens que esta instancia emite.
// =============================================================

import NextAuth from "next-auth";
import { authConfig } from "@/lib/authConfig";
import { credentialsProvider } from "@/lib/authProvider";

export const { handlers, auth: authNode, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  providers: [credentialsProvider],
});
