// =============================================================
// Sellix AI — Auth Middleware (Edge Runtime)
// Protege todas las rutas excepto login, API de auth, y assets
// =============================================================

export { auth as middleware } from "./auth";

export const config = {
  matcher: [
    // Protect everything except static files and auth endpoints
    "/((?!api/auth|auth/signin|_next/static|_next/image|favicon.ico).*)",
  ],
};
