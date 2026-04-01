# Decisiones de Stack Tecnológico — Unit 1: Foundation & Auth

| Capa | Tecnología | Versión | Justificación |
|---|---|---|---|
| Framework | Next.js | 14+ (App Router) | SSG nativo, routing, API routes para auth — especificado en PRD |
| Lenguaje | TypeScript | 5.x | Type safety end-to-end — especificado en PRD |
| Estilos | Tailwind CSS | 3.x | Utility-first, productividad, mobile-first — especificado en PRD |
| Autenticación | NextAuth.js | v5 (Auth.js) | CredentialsProvider nativo, manejo de sesión JWT, integración Next.js |
| Password hashing | bcryptjs | latest | Hash adaptativo para contraseñas — SECURITY-12 |
| Iconos | Lucide React | latest | Librería ligera compatible con React/Next.js |
| Despliegue | Vercel | latest | Plataforma nativa Next.js, CDN global, env vars gestionadas — especificado en Q3 |
| Gestor de paquetes | npm | latest | Lock file (`package-lock.json`) — SECURITY-10 |

## Decisiones adicionales

| Decisión | Opción elegida | Alternativa descartada | Razón |
|---|---|---|---|
| Rate limiting store | Map en memoria | Redis | MVP single-instance en Vercel; Redis agrega complejidad innecesaria |
| Session strategy | JWT (cookies) | Database sessions | Sin base de datos en Fase 1; JWT es suficiente para un solo usuario |
| CSS approach | Tailwind utility classes | CSS Modules | Especificado en PRD; consistente con componentes de tablas y gráficas |
| Error pages | App Router `error.tsx` | Custom 500 pages | Integración nativa con Next.js App Router |
| Font loading | `next/font` (Google Fonts local) | CDN de Google Fonts externo | Evita request externo; mejor privacidad; sin SRI requerido |
