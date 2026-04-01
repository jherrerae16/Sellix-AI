# Modelo de Lógica de Negocio — Unit 1: Foundation & Auth

---

## 1. Flujo de Autenticación

```
Usuario → POST /api/auth/callback/credentials
    │
    ├── [1] Extraer IP del request
    ├── [2] RateLimiter.checkRateLimit(ip)
    │       ├── SI bloqueado → retornar error "Demasiados intentos" (HTTP 429)
    │       └── SI libre → continuar
    ├── [3] Validar credentials.username === process.env.APP_USER
    ├── [4] Validar bcrypt.compare(credentials.password, process.env.APP_PASSWORD_HASH)
    │       ├── SI inválidas → RateLimiter.recordFailedAttempt(ip) → error genérico
    │       └── SI válidas → continuar
    ├── [5] RateLimiter.resetAttempts(ip)
    ├── [6] Logger.logAuthEvent('login_success', ip)
    └── [7] NextAuth emite JWT → cookie HttpOnly + SameSite=Lax + Secure
```

## 2. Flujo de Protección de Rutas

```
Request entrante → middleware.ts
    │
    ├── ¿La ruta coincide con /auth/* ?
    │       └── SI → pasar sin verificar (rutas públicas)
    ├── getToken(request) → verificar JWT en cookie
    │       ├── SI token válido y no expirado → continuar request
    │       └── SI sin token o expirado → redirect 307 → /auth/signin
    └── ¿El token tiene exp < now() ?
            └── SI → redirect a /auth/signin con mensaje de sesión expirada
```

## 3. Flujo de Rate Limiting

```
Estado en memoria: Map<ip, { count: number, lastAttempt: Date, blockedUntil: Date | null }>

checkRateLimit(ip):
    ├── SI ip no existe en Map → { allowed: true }
    ├── SI blockedUntil > now() → { allowed: false, retryAfterMs: blockedUntil - now() }
    └── SI count < 5 → { allowed: true }

recordFailedAttempt(ip):
    ├── Incrementar count
    ├── Actualizar lastAttempt = now()
    └── SI count >= 5 → blockedUntil = now() + 15 minutos

resetAttempts(ip):
    └── Eliminar entrada del Map
```

## 4. Flujo de Cierre de Sesión

```
Usuario → clic "Cerrar sesión" en Sidebar
    │
    ├── signOut({ callbackUrl: '/auth/signin' })
    ├── NextAuth invalida token JWT en servidor
    ├── Limpia cookie de sesión
    └── Redirect → /auth/signin
```

## 5. Flujo de Carga de Datos del TopBar

```
AppShell (Server Component) se renderiza
    │
    ├── getServerSession() → verifica sesión activa
    ├── DataService.fetchKPIsResumen() → lee public/data/kpis_resumen.json
    ├── Extrae clientes_en_riesgo_alto
    └── Pasa como prop a TopBar → renderiza badge rojo si > 0
```

## 6. Flujo de Acceso a Datos (DataService)

```
Server Component llama DataService.fetch*()
    │
    ├── fetch('/data/{file}.json', { cache: 'force-cache' })
    │       ├── SI éxito → parsear JSON → retornar tipado
    │       └── SI error → Logger.logError() → retornar estructura vacía segura
    └── Los datos nunca se revalidan en runtime (SSG estático)
        └── Solo se actualizan con nuevo deploy tras ejecutar ETL
```

## 7. Flujo de Logging de Seguridad

```
Evento de seguridad ocurre (login, logout, rate limit, error)
    │
    ├── Logger.logAuthEvent(event, ip)
    │       └── Crea LogEntry: { timestamp, level: 'info'|'warn', correlationId, message }
    │           └── SIN incluir: contraseñas, tokens, nombres de usuario, PII
    ├── Console.log(JSON.stringify(entry)) → capturado por Vercel Logs
    └── Para errores no manejados → global error handler → Logger.logError(err, context)
```
