# Entidades del Dominio — Unit 1: Foundation & Auth

---

## UserSession
Representa la sesión autenticada de un usuario del dashboard.

```typescript
interface UserSession {
  userId: string        // ID único del usuario (ej: "admin")
  userName: string      // Nombre para mostrar en TopBar (ej: "Droguería Super Ofertas")
  expires: string       // ISO timestamp de expiración (8h desde login)
}
```
**Ciclo de vida**: Creada al login exitoso → persiste en cookie JWT → destruida en logout o expiración  
**Restricción**: Una sola instancia por aplicación (MVP single-user)

---

## AuthAttempt
Rastreo de intentos de login por IP para rate limiting.

```typescript
interface AuthAttempt {
  ip: string            // IP del cliente (header x-forwarded-for o remoteAddress)
  count: number         // Número de intentos fallidos consecutivos
  lastAttempt: Date     // Timestamp del último intento fallido
  blockedUntil: Date | null  // null = no bloqueado; Date = bloqueado hasta esa hora
}
```
**Ciclo de vida**: Creada al primer intento fallido → bloqueada a los 5 fallos → eliminada al login exitoso  
**Storage**: Map en memoria del proceso Node.js (suficiente para MVP)

---

## LogEntry
Entrada de log estructurada conforme a SECURITY-03.

```typescript
interface LogEntry {
  timestamp: string           // ISO 8601: "2025-10-31T10:30:00.000Z"
  level: 'info' | 'warn' | 'error'
  correlationId: string       // UUID generado por request (para correlacionar eventos)
  message: string             // Mensaje legible por humanos
  context?: {                 // Datos adicionales — SIN PII ni secrets
    event?: string            // "login_success" | "login_failure" | "logout" | "rate_limited"
    ip?: string               // IP anonimizada (solo últimos 2 octetos para logs de auth)
    module?: string           // Módulo de la aplicación que generó el log
    statusCode?: number       // HTTP status code si aplica
  }
}
```

---

## NavigationItem
Ítem de la navegación del Sidebar.

```typescript
interface NavigationItem {
  label: string         // Texto en español: "Resumen Ejecutivo"
  href: string          // Ruta: "/", "/cruzada", "/churn", etc.
  icon: string          // Nombre del ícono (Lucide React)
  badge?: number        // Opcional: contador (usado para churn alto en TopBar)
}
```

---

## AppConfig
Configuración global de la aplicación leída desde variables de entorno.

```typescript
// Solo en servidor — NUNCA expuesto al cliente
interface AppConfig {
  nextAuthSecret: string      // NEXTAUTH_SECRET: JWT signing key
  nextAuthUrl: string         // NEXTAUTH_URL: URL pública del sitio
  appUser: string             // APP_USER: nombre de usuario
  appPasswordHash: string     // APP_PASSWORD_HASH: bcrypt hash de la contraseña
}
```
**Restricción crítica**: Ninguno de estos valores puede aparecer en logs, responses, ni bundle del cliente.
