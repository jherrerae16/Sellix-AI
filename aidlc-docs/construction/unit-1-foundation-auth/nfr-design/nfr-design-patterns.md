# Patrones NFR — Unit 1: Foundation & Auth

---

## SECURITY-08 — Patrón Middleware Guard (Deny by Default)

**Patrón**: Interceptor centralizado en el borde de la aplicación.

```
Request → middleware.ts (EDGE runtime)
    ├── Extrae token JWT de cookie
    ├── Verifica firma y expiración
    ├── SI válido → continúa el request
    └── SI inválido/ausente → NextResponse.redirect('/auth/signin')
```

**Implementación**: `src/middleware.ts` con `config.matcher` que excluye `/auth/*`, `/_next/*`, `/favicon.ico`, `/data/*`

**Ventaja**: Una sola función protege todos los módulos sin duplicar lógica en cada página.

---

## SECURITY-11 — Patrón Rate Limiter (Token Bucket simplificado)

**Patrón**: Contador de intentos fallidos por IP con ventana de bloqueo fija.

```
Estructura: Map<ip, AuthAttempt>

Algoritmo:
    1. Consultar Map[ip]
    2. SI blockedUntil > now() → rechazar inmediatamente
    3. SI count >= 5 → establecer blockedUntil = now() + 15min → rechazar
    4. SI count < 5 → permitir → tras fallo: incrementar count
    5. Tras éxito → eliminar entrada del Map
```

**Nota de escala**: Para producción multi-instancia (Vercel edge), migrar a Redis o KV store. Para MVP single-instance es suficiente el Map en memoria.

---

## SECURITY-04 — Patrón HTTP Security Headers

**Patrón**: Headers de seguridad aplicados globalmente en `next.config.ts`.

```typescript
// Aplicado a todas las rutas con headers()
headers: [
  { key: 'Content-Security-Policy', value: "default-src 'self'; ..." },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
]
```

---

## SECURITY-15 — Patrón Fail-Closed + Global Error Handler

**Patrón**: En cualquier condición de error, denegar acceso y loggear — nunca fallar abierto.

```
Error en authorize() → retornar null (NextAuth interpreta como fallo de auth)
Error en middleware → redirect a /auth/signin (nunca pasar a la página protegida)
Error en DataService → retornar estructura vacía + loggear (no romper la página)
Error no manejado → app/error.tsx captura → muestra mensaje genérico + loggea
```

**Regla clave**: Ningún error debe exponer datos internos ni otorgar acceso inesperado.

---

## SECURITY-03 — Patrón Structured Logging

**Patrón**: Logging uniforme con campos fijos para facilitar búsqueda y análisis.

```typescript
// Formato de cada entrada:
{
  "timestamp": "2025-10-31T10:30:00.000Z",
  "level": "warn",
  "correlationId": "req_abc123",
  "message": "Login failed",
  "context": {
    "event": "login_failure",
    "ip": "192.168.x.x"   // IP parcialmente anonimizada
  }
}
// Destino: stdout → Vercel Logs (captura automática)
```

---

## SECURITY-12 — Patrón Secure Session Cookie

**Patrón**: JWT firmado en cookie con atributos de seguridad máximos.

```
Cookie: next-auth.session-token
Atributos:
  - HttpOnly: true   → inaccesible desde JavaScript del cliente
  - Secure: true     → solo HTTPS
  - SameSite: Lax    → protección CSRF básica
  - Path: /          → disponible en toda la app
  - MaxAge: 28800    → 8 horas
```
