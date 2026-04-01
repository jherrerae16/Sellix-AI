# Resumen de Código Generado — Unit 1: Foundation & Auth

**Fecha de generación**: 2026-04-01  
**Estado**: COMPLETADO — 31 archivos generados

---

## Archivos Generados

### BLOQUE A — Configuración del Proyecto

| Archivo | Descripción |
|---|---|
| `package.json` | Dependencias con versiones exactas (Next.js 14.2.20, React 18.3.1, NextAuth 5.0.0-beta.25, bcryptjs 2.4.3, TanStack Table 8.20.5, Recharts 2.15.0, Lucide 0.462.0) |
| `tsconfig.json` | TypeScript 5.x estricto con path alias `@/*` → `./src/*` |
| `next.config.ts` | Headers HTTP de seguridad: X-Frame-Options, X-Content-Type-Options, HSTS, CSP, Referrer-Policy, Permissions-Policy |
| `tailwind.config.ts` | Colores Sellix AI: brand.blue (#185FA5), brand.red (#E24B4A), brand.orange (#EF9F27), brand.green (#3B6D11) + fuente Inter |
| `postcss.config.mjs` | Tailwind CSS + Autoprefixer |
| `.env.local.example` | Plantilla de variables: NEXTAUTH_SECRET, NEXTAUTH_URL, APP_USER, APP_PASSWORD_HASH |
| `.gitignore` | Excluye node_modules, .env.local, data/raw/, data/processed/, .next/ |

### BLOQUE B — Biblioteca Core (`src/lib/`)

| Archivo | Descripción |
|---|---|
| `src/lib/types.ts` | 10 interfaces TypeScript: KPIsResumen, ClienteChurn, ReposicionPendiente, VentaCruzada, ClienteRFM, ProductoGancho, VentaMensual, TopProducto, UserSession |
| `src/lib/formatters.ts` | formatCOP(), formatDate(), formatPercent(), formatScore(), formatDays(), formatNumber() — convención es-CO |
| `src/lib/dataService.ts` | 8 funciones fetch tipadas para JSON públicos con `next: { revalidate: false }` (SSG) |
| `src/lib/logger.ts` | logInfo(), logWarn(), logError(), logAuthEvent() — JSON estructurado a stdout (SECURITY-03) |
| `src/lib/rateLimiter.ts` | Map en memoria — 5 intentos → bloqueo 15min por IP (SECURITY-11) |
| `src/lib/authConfig.ts` | NextAuth CredentialsProvider: bcrypt.compare(), rate limiting, cookies HttpOnly+SameSite, JWT 8h (SECURITY-12) |

### BLOQUE C — Middleware y Auth API

| Archivo | Descripción |
|---|---|
| `src/auth.ts` | Instancia NextAuth v5 — exporta handlers, auth, signIn, signOut |
| `src/middleware.ts` | getToken() Edge-compatible — verifica JWT, redirige a /auth/signin (SECURITY-08) |
| `src/app/api/auth/[...nextauth]/route.ts` | Handlers GET/POST de NextAuth v5 |

### BLOQUE D — Páginas de Auth

| Archivo | Descripción |
|---|---|
| `src/app/auth/signin/page.tsx` | Formulario login: loading state, error genérico (SECURITY-09), data-testid para tests |

### BLOQUE E — Layout Shell

| Archivo | Descripción |
|---|---|
| `src/app/globals.css` | Fuente Inter desde Google Fonts, estilos Tailwind base |
| `src/app/layout.tsx` | AppShell: SessionProvider + Sidebar + TopBar (solo en rutas autenticadas) |
| `src/components/layout/Sidebar.tsx` | 6 nav links, estado activo con usePathname, botón logout con signOut() |
| `src/components/layout/TopBar.tsx` | Badge de churn count enlazando a /churn, nombre de usuario |

### BLOQUE F — Componentes UI Reutilizables

| Archivo | Descripción |
|---|---|
| `src/components/ui/KPICard.tsx` | Formatos: cop, number, percent, score, days; variantes de color; onClick opcional |
| `src/components/ui/RiskBadge.tsx` | Alto=rojo, Medio=naranja, Bajo=verde — badge compacto |
| `src/components/ui/FilterBar.tsx` | Composable: búsqueda, dropdown, date range (desde/hasta), botón limpiar |
| `src/components/ui/SearchInput.tsx` | Debounce 300ms, botón limpiar integrado, data-testid |
| `src/components/ui/ExportButton.tsx` | CSV UTF-8 con BOM (compatible Excel), descarga automática sin servidor |
| `src/components/ui/AccionCajaPanel.tsx` | Frase accionable para cajero en lenguaje simple, top recomendación destacada |
| `src/components/ui/ClienteDetailPanel.tsx` | Drawer lateral con datos churn, RFM y reposiciones del cliente |

### BLOQUE G — Error Handling y Páginas Sistema

| Archivo | Descripción |
|---|---|
| `src/app/error.tsx` | Error boundary con mensaje genérico + log de digest (SECURITY-15) |
| `src/app/global-error.tsx` | Error handler raíz — incluye html+body propio (SECURITY-15) |
| `src/app/not-found.tsx` | Página 404 en español con enlace al inicio |

### BLOQUE H — Placeholder Página Principal

| Archivo | Descripción |
|---|---|
| `src/app/page.tsx` | Placeholder autenticado — confirma AppShell + auth funciona; será reemplazado en Unit 3 |

### BLOQUE I — Directorios de Datos

| Directorio | Descripción |
|---|---|
| `public/data/` | JSON estáticos servidos por Vercel CDN — generados por ETL (Unit 2) |
| `data/raw/` | Archivos Excel originales — excluidos de git (datos de clientes) |
| `data/processed/` | Datos intermedios del ETL — excluidos de git |

---

## Instrucciones de Configuración Inicial

### 1. Instalar dependencias

```bash
npm ci
```

### 2. Crear archivo de variables de entorno

```bash
cp .env.local.example .env.local
```

### 3. Generar hash de contraseña

```bash
node -e "const b=require('bcryptjs'); b.hash('TU_CONTRASEÑA_AQUI', 12).then(console.log)"
```

Copiar el hash generado en `APP_PASSWORD_HASH` dentro de `.env.local`.

### 4. Generar NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

Copiar el valor en `NEXTAUTH_SECRET` dentro de `.env.local`.

### 5. Completar `.env.local`

```env
NEXTAUTH_SECRET=<valor generado en paso 4>
NEXTAUTH_URL=http://localhost:3000
APP_USER=admin
APP_PASSWORD_HASH=<hash generado en paso 3>
```

### 6. Ejecutar en desarrollo

```bash
npm run dev
```

Abrir http://localhost:3000 — será redirigido a `/auth/signin`.

### 7. Verificar build de producción

```bash
npm run build
```

---

## Cobertura de Seguridad

| Regla | Implementación |
|---|---|
| SECURITY-03 | `src/lib/logger.ts` — JSON estructurado a stdout |
| SECURITY-04 | `next.config.ts` — CSP, HSTS, X-Frame-Options, etc. |
| SECURITY-08 | `src/middleware.ts` — JWT guard en Edge Runtime |
| SECURITY-09 | `src/app/auth/signin/page.tsx` — error genérico, `error.tsx`, `global-error.tsx` |
| SECURITY-10 | `package.json` con versiones exactas + `package-lock.json` commiteado |
| SECURITY-11 | `src/lib/rateLimiter.ts` — 5 intentos → 15min bloqueo |
| SECURITY-12 | `src/lib/authConfig.ts` — bcrypt, JWT 8h, cookies HttpOnly+SameSite |
| SECURITY-15 | `src/app/error.tsx` + `src/app/global-error.tsx` — fail-closed |

---

## Siguiente Unidad

**Unit 2 — ETL Pipeline**: Generación de `scripts/etl.py` con los 8 calculadores que producen los JSON en `public/data/`.
