# Dependencias de Componentes — Sellix AI

---

## Matriz de Dependencias

| Componente | Depende de | Consumido por |
|---|---|---|
| `AppShell` | AuthService (session), Sidebar, TopBar | Next.js App Router |
| `Sidebar` | AuthService (signOut), Next/Link | AppShell |
| `TopBar` | DataService (churn count), Next/Link | AppShell |
| `DashboardPage` | DataService, KPICard, VentasMensualesChart, TopProductosChart, FrecuenciaHistogram, FilterBar, types | AppShell |
| `VentaCruzadaPage` | DataService, VentaCruzadaTable, SearchInput, FilterBar, AccionCajaPanel, types | AppShell |
| `ChurnPage` | DataService, ChurnTable, FilterBar, types | AppShell |
| `ReposicionPage` | DataService, ReposicionTable, FilterBar, SearchInput, types | AppShell |
| `VIPPage` | DataService, ScatterRFM, VIPTable, FilterBar, ClienteDetailPanel, types | AppShell |
| `GanchoPage` | DataService, GanchoTable, BubbleGancho, FilterBar, types | AppShell |
| `LoginPage` | AuthService (signIn), logger | Next.js Auth Router |
| `middleware.ts` | AuthService (getServerSession) | Next.js runtime |
| `DataService` | fetch() nativo, types, logger | Todas las páginas |
| `AuthService` | NextAuth.js, RateLimiterService, logger | LoginPage, Sidebar, middleware |
| `RateLimiterService` | logger | AuthService |
| `ExportButton` | — (standalone) | ChurnTable, ReposicionTable |
| `ChurnTable` | TanStack Table, RiskBadge, ExportButton, formatters, types | ChurnPage |
| `ReposicionTable` | TanStack Table, RiskBadge, ExportButton, formatters, types | ReposicionPage |
| `VentaCruzadaTable` | TanStack Table, formatters, types | VentaCruzadaPage |
| `VIPTable` | TanStack Table, RiskBadge, formatters, types | VIPPage |
| `GanchoTable` | TanStack Table, formatters, types | GanchoPage |
| `ScatterRFM` | Recharts, types, formatters | VIPPage |
| `BubbleGancho` | Recharts, types, formatters | GanchoPage |
| `VentasMensualesChart` | Recharts, types, formatters | DashboardPage |
| `TopProductosChart` | Recharts, types, formatters | DashboardPage |
| `FrecuenciaHistogram` | Recharts, types | DashboardPage |
| `KPICard` | formatters | DashboardPage |
| `RiskBadge` | — | ChurnTable, ReposicionTable, VIPTable |
| `FilterBar` | — | DashboardPage, ChurnPage, ReposicionPage, VIPPage, GanchoPage |
| `SearchInput` | — | VentaCruzadaPage, ReposicionPage |
| `AccionCajaPanel` | formatters | VentaCruzadaPage |
| `ClienteDetailPanel` | Recharts (mini-chart), types, formatters | VIPPage |
| `types.ts` | — | Todos los componentes |
| `formatters.ts` | — | Componentes de tablas, gráficas y UI |
| `logger.ts` | — | DataService, AuthService, RateLimiterService |
| `ETLPipeline` | pandas, openpyxl, json, pathlib | Script standalone |

---

## Flujo de Datos — Dashboard Runtime

```
Vercel CDN
    │
    ├── public/data/*.json  (estáticos, generados por ETL)
    │       │
    │       └── DataService.fetch*()
    │               │
    │               └── Server Components (DashboardPage, ChurnPage, etc.)
    │                       │
    │                       └── Props → Client Components (tablas, gráficas, filtros)
    │
    └── next.config.ts HTTP Headers (CSP, HSTS, X-Frame, etc.)
            │
            └── Todas las respuestas HTML del servidor
```

---

## Flujo de Autenticación

```
Usuario → LoginPage
    │
    └── signIn(credentials) → AuthService.authorize()
            │
            ├── RateLimiterService.checkRateLimit(ip)
            │       └── Si bloqueado → Error 429 "Demasiados intentos"
            │
            ├── Valida usuario/contraseña vs. env vars
            │       └── Si inválido → Error genérico "Credenciales inválidas"
            │
            └── Si válido → Sesión JWT (HttpOnly cookie)
                    │
                    └── middleware.ts intercepta TODAS las rutas
                            └── getServerSession() → Si no hay sesión → redirect /auth/signin
```

---

## Flujo ETL → Dashboard

```
Desarrollador (Andrés)
    │
    └── python scripts/etl.py
            │
            ├── data/raw/Ventas_Superofertas.xlsx
            ├── data/raw/Remisiones_Mayo_Octubre_Superofertas.xlsx
            │
            ├── resumen_calidad_datos() → Imprime reporte · Bloquea si error crítico
            │
            ├── 8 calculadores de módulos (secuencial)
            │
            └── public/data/
                    ├── kpis_resumen.json
                    ├── ventas_mensuales.json
                    ├── top_productos.json
                    ├── ventas_cruzadas.json
                    ├── churn_clientes.json
                    ├── reposicion_activa.json
                    ├── segmentacion_rfm.json
                    └── productos_gancho.json
                            │
                            └── vercel deploy → Dashboard actualizado
```

---

## Patrones de Comunicación

| Patrón | Dónde se usa | Justificación |
|---|---|---|
| **Props drilling** | Páginas → Tablas/Gráficas | Componentes hijos son simples, sin estado compartido complejo |
| **Lifting state up** | Páginas → FilterBar/SearchInput | El filtro activo vive en la página y se pasa a tabla y gráfica |
| **Server fetch → Client render** | Server Pages → Client Components | Next.js SSG: datos en servidor, interactividad en cliente |
| **Callback props** | VIPTable → VIPPage (onClienteClick) | El drawer vive en la página, la tabla solo notifica |
| **Static assets** | DataService → public/data/ | Sin API dinámica en runtime — máximo rendimiento y simplicidad |
| **Middleware guard** | middleware.ts → todas las rutas | Protección centralizada, no duplicada en cada página |

---

## Restricciones de Dependencias

1. **ETLPipeline es completamente independiente** del frontend — no comparte código con Next.js
2. **Los JSON de `public/data/` son la única interfaz** entre ETL y frontend — no hay llamadas API
3. **AuthService NO accede a los JSON de datos** — separación total entre auth y datos de negocio
4. **Los componentes de tablas NO conocen la fuente de datos** — solo reciben props tipadas
5. **logger.ts NO loggea PII ni secrets** — solo IDs de correlación, niveles de riesgo y mensajes genéricos
