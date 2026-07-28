// =============================================================
// Sellix AI — Route handler NextAuth.js v5
// Maneja todos los callbacks de autenticación: GET y POST
//
// Usa la instancia de Node (authNode), que incluye el provider de
// credenciales contra la tabla `users`. El middleware usa la
// instancia Edge-safe de src/auth.ts.
// =============================================================

import { handlers } from "@/lib/authNode";

// El provider consulta Postgres y hace bcrypt: requiere Node runtime.
export const runtime = "nodejs";

export const { GET, POST } = handlers;
