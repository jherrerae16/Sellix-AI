# Componentes Lógicos NFR — Unit 1: Foundation & Auth

| Componente lógico | Implementación física | Patrón NFR |
|---|---|---|
| Auth Guard | `src/middleware.ts` | SECURITY-08 Middleware Guard |
| Rate Limiter | `src/lib/rateLimiter.ts` (Map en memoria) | SECURITY-11 Token Bucket |
| Security Headers | `next.config.ts` → `headers()` | SECURITY-04 |
| Structured Logger | `src/lib/logger.ts` → stdout | SECURITY-03 |
| Session Manager | NextAuth.js JWT + cookie | SECURITY-12 |
| Global Error Handler | `app/error.tsx` + `app/global-error.tsx` | SECURITY-15 Fail-Closed |
| Credentials Validator | `src/lib/authConfig.ts` → `authorize()` | SECURITY-12 bcrypt |
| Supply Chain Lock | `package-lock.json` (commiteado) | SECURITY-10 |
