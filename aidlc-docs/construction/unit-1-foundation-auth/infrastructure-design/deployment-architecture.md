# Arquitectura de Despliegue — Unit 1: Foundation & Auth

## Diagrama de Despliegue

```
Internet
    │
    └── Usuario (Chrome/Edge en desktop/tablet)
            │  HTTPS
            ▼
    +---------------------------+
    |       Vercel CDN          |  Global Edge Network
    |  (HTML, CSS, JS, JSON)    |  Cache-Control: public, immutable
    +---------------------------+
            │ Requests dinámicos (auth, API routes)
            ▼
    +---------------------------+
    |  Vercel Edge Runtime      |  middleware.ts
    |  (Auth Guard)             |  Verifica JWT en cada request
    +---------------------------+
            │ Requests autenticados
            ▼
    +---------------------------+
    |  Vercel Serverless Fns    |  Next.js App Router
    |  (Server Components,      |  /api/auth/* (NextAuth)
    |   API Routes)             |  getServerSession()
    +---------------------------+
            │ Variables de entorno
            ▼
    +---------------------------+
    |  Vercel Env Variables     |  NEXTAUTH_SECRET
    |  (Secrets management)     |  APP_USER, APP_PASSWORD_HASH
    +---------------------------+
            │ Logs
            ▼
    +---------------------------+
    |  Vercel Logs              |  stdout/stderr
    |  (Observability)          |  Auth events, errors
    +---------------------------+
```

## Flujo de Request Autenticado

```
1. Browser → GET /churn (cookie con JWT)
2. Vercel Edge → middleware.ts → verifica JWT
3. SI válido → Vercel Serverless → ChurnPage (Server Component)
4. ChurnPage → fetch('/data/churn_clientes.json') desde CDN
5. Renderiza HTML con datos → response al browser
6. Browser renderiza página en < 3s
```

## Flujo de Request de Login

```
1. Browser → POST /api/auth/callback/credentials
2. Vercel Serverless → NextAuth handler
3. NextAuth → authConfig.authorize()
4. authorize() → rateLimiter.check(ip) → bcrypt.compare(password, hash)
5. SI válido → JWT firmado → Set-Cookie: session (HttpOnly, Secure, SameSite)
6. Redirect → / (Resumen Ejecutivo)
```
