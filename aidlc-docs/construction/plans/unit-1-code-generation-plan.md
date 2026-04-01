# Plan de Generación de Código — Unit 1: Foundation & Auth

**Workspace root**: `/Users/jdh/Desktop/SellixAI-MVP`  
**Tipo**: Greenfield — monolito Next.js App Router  
**Código de aplicación**: directamente en workspace root (nunca en aidlc-docs/)

**Historias implementadas**: US-E7-01 · US-E7-02 · US-E7-03  
**Dependencias**: Ninguna (unidad base)

---

## Contexto de la Unidad

- Inicializar el proyecto Next.js 14+ con toda su configuración base
- Implementar autenticación con NextAuth.js (SECURITY-08, SECURITY-11, SECURITY-12)
- Aplicar headers de seguridad HTTP globales (SECURITY-04)
- Crear layout shell (Sidebar + TopBar) con navegación completa
- Crear todos los componentes UI reutilizables que necesitan Units 3 y 4
- Implementar logging estructurado y error handling (SECURITY-03, SECURITY-15)

---

## Pasos de Generación

### BLOQUE A — Configuración del Proyecto
- [x] **Paso 1**: `package.json` — dependencias con versiones exactas (Next.js, NextAuth, bcryptjs, TanStack Table, Recharts, Tailwind, Lucide, TypeScript)
- [x] **Paso 2**: `tsconfig.json` — TypeScript estricto con paths de Next.js
- [x] **Paso 3**: `next.config.ts` — HTTP security headers (SECURITY-04), configuración de imágenes, TypeScript strict
- [x] **Paso 4**: `tailwind.config.ts` + `postcss.config.mjs` — colores Sellix AI, fuente Inter
- [x] **Paso 5**: `.env.local.example` — plantilla de variables de entorno (sin valores reales)
- [x] **Paso 6**: `.gitignore` — excluir node_modules, .env.local, data/raw/, .next/

### BLOQUE B — Biblioteca Core (`src/lib/`)
- [x] **Paso 7**: `src/lib/types.ts` — todas las interfaces TypeScript (KPIsResumen, ClienteChurn, ReposicionPendiente, VentaCruzada, ClienteRFM, ProductoGancho, VentaMensual, TopProducto)
- [x] **Paso 8**: `src/lib/formatters.ts` — formatCOP(), formatDate(), formatPercent(), formatScore(), formatDays()
- [x] **Paso 9**: `src/lib/dataService.ts` — fetch tipado para los 8 JSON con cache SSG y error handling
- [x] **Paso 10**: `src/lib/logger.ts` — logging estructurado JSON a stdout (SECURITY-03), logAuthEvent(), logError()
- [x] **Paso 11**: `src/lib/rateLimiter.ts` — Map en memoria, 5 intentos → 15min bloqueo (SECURITY-11)
- [x] **Paso 12**: `src/lib/authConfig.ts` — NextAuth CredentialsProvider con bcrypt, callbacks de sesión, configuración de cookies seguras

### BLOQUE C — Middleware y Auth API
- [x] **Paso 13**: `src/middleware.ts` — intercepción de rutas, verificación JWT, redirect a /auth/signin, matcher config
- [x] **Paso 14**: `src/app/api/auth/[...nextauth]/route.ts` — handler NextAuth con authConfig

### BLOQUE D — Páginas de Auth
- [x] **Paso 15**: `src/app/auth/signin/page.tsx` — formulario de login con error handling genérico, loading state, data-testid

### BLOQUE E — Layout Shell
- [x] **Paso 16**: `src/app/layout.tsx` — AppShell: SessionProvider, fetch de kpis para TopBar, Sidebar + TopBar + children
- [x] **Paso 17**: `src/components/layout/Sidebar.tsx` — nav links, estado activo con usePathname, logout button
- [x] **Paso 18**: `src/components/layout/TopBar.tsx` — badge churn, nombre usuario, link a /churn

### BLOQUE F — Componentes UI Reutilizables
- [x] **Paso 19**: `src/components/ui/KPICard.tsx` — formateo por tipo, variantes de color, onClick opcional
- [x] **Paso 20**: `src/components/ui/RiskBadge.tsx` — mapeo nivel → color, badge compacto
- [x] **Paso 21**: `src/components/ui/FilterBar.tsx` — composable: date picker, dropdowns, botones de filtro
- [x] **Paso 22**: `src/components/ui/SearchInput.tsx` — debounce 300ms, limpiar, onChange
- [x] **Paso 23**: `src/components/ui/ExportButton.tsx` — genera CSV UTF-8 con BOM, descarga automática
- [x] **Paso 24**: `src/components/ui/AccionCajaPanel.tsx` — frase accionable en lenguaje simple para cajero
- [x] **Paso 25**: `src/components/ui/ClienteDetailPanel.tsx` — drawer/panel lateral con historial de cliente

### BLOQUE G — Error Handling y Páginas Sistema
- [x] **Paso 26**: `src/app/error.tsx` — error boundary con mensaje genérico y log (SECURITY-15)
- [x] **Paso 27**: `src/app/global-error.tsx` — error handler raíz de la aplicación
- [x] **Paso 28**: `src/app/not-found.tsx` — página 404 en español

### BLOQUE H — Placeholder de Página Principal
- [x] **Paso 29**: `src/app/page.tsx` — placeholder autenticado que confirma auth funciona (será reemplazado en Unit 3 con el Resumen Ejecutivo real)

### BLOQUE I — Directorios de Datos
- [x] **Paso 30**: `public/data/.gitkeep` + `data/raw/.gitkeep` + `data/processed/.gitkeep` — estructura de directorios

### BLOQUE J — Documentación
- [x] **Paso 31**: `aidlc-docs/construction/unit-1-foundation-auth/code/code-summary.md` — resumen de archivos generados, instrucciones de configuración inicial

---

## Cobertura de Historias
| Historia | Pasos que la implementan |
|---|---|
| US-E7-01 — Iniciar sesión | Pasos 12, 13, 14, 15 (auth completo con rate limiting) |
| US-E7-02 — Cerrar sesión | Pasos 16, 17 (logout en Sidebar + NextAuth signOut) |
| US-E7-03 — Mantener sesión | Pasos 12, 13 (JWT 8h + middleware guard) |

## Reglas de Seguridad Cubiertas
| Regla | Pasos |
|---|---|
| SECURITY-03 | Paso 10 (logger.ts) |
| SECURITY-04 | Paso 3 (next.config.ts headers) |
| SECURITY-08 | Paso 13 (middleware.ts) |
| SECURITY-09 | Paso 15, 26, 27 (errores genéricos) |
| SECURITY-10 | Paso 1 (package.json con versiones exactas), Paso 6 (.gitignore) |
| SECURITY-11 | Paso 11 (rateLimiter.ts) |
| SECURITY-12 | Paso 12 (authConfig.ts — bcrypt, cookies seguras, expiración 8h) |
| SECURITY-15 | Pasos 26, 27 (error.tsx, global-error.tsx) |
