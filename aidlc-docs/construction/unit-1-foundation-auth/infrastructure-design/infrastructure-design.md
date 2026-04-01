# Diseño de Infraestructura — Unit 1: Foundation & Auth

## Plataforma: Vercel

| Componente de infraestructura | Servicio Vercel | Detalles |
|---|---|---|
| Compute (Server Components + API routes) | Vercel Serverless Functions | Node.js runtime; región automática más cercana al usuario |
| Compute (middleware.ts) | Vercel Edge Runtime | Latencia ultra-baja para verificación de sesión |
| Static assets (HTML, CSS, JS, JSON) | Vercel CDN | Pre-renderizado en build time; distribuido globalmente |
| Environment variables | Vercel Environment Variables | NEXTAUTH_SECRET, NEXTAUTH_URL, APP_USER, APP_PASSWORD_HASH |
| Logs | Vercel Logs | Captura automática de stdout/stderr; retención 1 día (plan gratuito) |
| Dominio | Vercel-provided (*.vercel.app) | Sin dominio personalizado en Fase 1 |

## Variables de Entorno Requeridas

| Variable | Descripción | Dónde se configura |
|---|---|---|
| `NEXTAUTH_SECRET` | Clave para firmar JWT (mínimo 32 chars random) | Vercel → Settings → Environment Variables |
| `NEXTAUTH_URL` | URL pública del sitio (ej: https://sellix-ai.vercel.app) | Vercel → Settings → Environment Variables |
| `APP_USER` | Nombre de usuario del dashboard (ej: "admin") | Vercel → Settings → Environment Variables |
| `APP_PASSWORD_HASH` | Hash bcrypt de la contraseña (generado localmente) | Vercel → Settings → Environment Variables |

**Nunca en código fuente, nunca en `.env.local` versionado, nunca en logs.**

## Build Configuration

| Parámetro | Valor |
|---|---|
| Build command | `next build` |
| Output directory | `.next` (gestionado por Vercel) |
| Node.js version | 20.x LTS |
| Install command | `npm ci` (usa lock file — SECURITY-10) |
| Framework preset | Next.js (detectado automáticamente por Vercel) |

## Deploy Pipeline (MVP — sin CI/CD)

```
Desarrollador (Andrés)
    │
    ├── 1. Ejecutar ETL localmente → genera public/data/*.json
    ├── 2. Verificar build local: npm run build
    ├── 3. vercel deploy --prod (Vercel CLI)
    └── 4. Vercel construye y despliega automáticamente
```

## Restricciones de Infraestructura

- **Sin base de datos**: No se requiere RDS, PlanetScale, ni ningún servicio de DB — las credenciales van en env vars y los datos en JSON estáticos.
- **Sin Redis**: Rate limiter en memoria es suficiente para MVP single-instance.
- **Sin CDN personalizado**: Vercel incluye CDN global sin configuración adicional.
- **Sin WAF**: Vercel no incluye WAF en plan gratuito; el rate limiting en aplicación es la mitigación para brute-force.
