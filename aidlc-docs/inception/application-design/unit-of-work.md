# Unidades de Trabajo — Sellix AI

**Total de unidades**: 4  
**Arquitectura**: Monolito modular (Next.js App Router + ETL Python independiente)  
**Estrategia de construcción**: Secuencial — cada unidad produce entregables verificables antes de la siguiente

---

## Unit 1 — Project Foundation & Authentication

**Descripción**: Base técnica completa del proyecto. Sin esta unidad ninguna otra puede construirse.

### Entregables
- Proyecto Next.js 14+ inicializado con TypeScript y Tailwind CSS
- `src/lib/types.ts` — todas las interfaces TypeScript del sistema
- `src/lib/formatters.ts` — formatCOP(), formatDate(), formatPercent()
- `src/lib/dataService.ts` — funciones de fetch para los 8 JSON
- `src/lib/authConfig.ts` — NextAuth.js CredentialsProvider configurado
- `src/lib/rateLimiter.ts` — rate limiting por IP (SECURITY-11)
- `src/lib/logger.ts` — logging estructurado (SECURITY-03)
- `src/middleware.ts` — protección de rutas (SECURITY-08)
- `src/app/auth/signin/page.tsx` — página de login
- `src/app/auth/[...nextauth]/route.ts` — handler NextAuth
- `src/components/layout/Sidebar.tsx` — navegación principal
- `src/components/layout/TopBar.tsx` — encabezado con badge de churn
- `src/app/layout.tsx` — AppShell con SessionProvider
- `src/components/ui/KPICard.tsx`
- `src/components/ui/RiskBadge.tsx`
- `src/components/ui/FilterBar.tsx`
- `src/components/ui/SearchInput.tsx`
- `src/components/ui/ExportButton.tsx`
- `src/components/ui/AccionCajaPanel.tsx`
- `src/components/ui/ClienteDetailPanel.tsx`
- `next.config.ts` — headers de seguridad HTTP (SECURITY-04)
- `.env.local.example` — plantilla de variables de entorno
- `package.json` con lock file (`package-lock.json`) versionado (SECURITY-10)
- Página placeholder `/` que confirma auth funciona

### Criterios de completitud
- [ ] `npm run dev` inicia sin errores
- [ ] Acceder a `/` sin sesión redirige a `/auth/signin`
- [ ] Login con credenciales correctas redirige al dashboard
- [ ] Login con credenciales incorrectas muestra error genérico
- [ ] 5 intentos fallidos activa el rate limiter
- [ ] Response headers incluyen CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy
- [ ] Logout invalida la sesión y redirige al login

### Dependencias
- Ninguna — esta es la unidad base

---

## Unit 2 — ETL Pipeline (Python)

**Descripción**: Script Python que transforma los datos Excel de la droguería en los 8 archivos JSON que alimentan el dashboard.

### Entregables
- `scripts/etl.py` — script completo con todos los calculadores
- `data/raw/.gitkeep` — directorio para archivos Excel (no versionados)
- `data/processed/.gitkeep` — directorio para datos intermedios
- `requirements.txt` — pandas, openpyxl, otras dependencias pinadas con versiones exactas (SECURITY-10)
- Documentación inline del ETL con logging de progreso

### Módulos del ETL
| Función | JSON output | Datos fuente |
|---|---|---|
| `resumen_calidad_datos()` | Console print | Ambos archivos |
| `calculate_kpis()` | `kpis_resumen.json` | Ventas + Remisiones |
| `calculate_ventas_mensuales()` | `ventas_mensuales.json` | Ventas + Remisiones |
| `calculate_top_productos()` | `top_productos.json` | Ventas + Remisiones |
| `calculate_ventas_cruzadas()` | `ventas_cruzadas.json` | Ventas + Remisiones |
| `calculate_churn()` | `churn_clientes.json` | Ventas + Remisiones |
| `calculate_reposicion()` | `reposicion_activa.json` | Ventas + Remisiones |
| `calculate_rfm()` | `segmentacion_rfm.json` | Ventas + Remisiones |
| `calculate_gancho()` | `productos_gancho.json` | Ventas + Remisiones |

### Criterios de completitud
- [ ] `python scripts/etl.py` ejecuta sin errores con los datos de Super Ofertas
- [ ] Reporte de calidad de datos imprime las métricas esperadas
- [ ] Los 8 archivos JSON se generan en `public/data/`
- [ ] Ejecución repetida produce JSON idénticos (reproducibilidad)
- [ ] ETL falla explícitamente si los archivos de entrada no existen
- [ ] Consumidor anónimo (222222222222) excluido de modelos de clientes

### Dependencias
- Unit 1 (estructura de carpetas del proyecto, en particular `public/data/`)

---

## Unit 3 — Módulos Fase 1 (Dashboard)

**Descripción**: Los 4 módulos operacionales del dashboard que dan valor inmediato al gerente y al cajero.

### Entregables

#### Módulo 1.1 — Resumen Ejecutivo
- `src/app/page.tsx` — página principal con KPIs, gráficas y filtros
- `src/components/charts/VentasMensualesChart.tsx`
- `src/components/charts/TopProductosChart.tsx`
- `src/components/charts/FrecuenciaHistogram.tsx`

#### Módulo 1.2 — Venta Cruzada
- `src/app/cruzada/page.tsx`
- `src/components/tables/VentaCruzadaTable.tsx`

#### Módulo 1.3 — Riesgo de Abandono
- `src/app/churn/page.tsx`
- `src/components/tables/ChurnTable.tsx`

#### Módulo 1.4 — Retención Activa / Reposición
- `src/app/reposicion/page.tsx`
- `src/components/tables/ReposicionTable.tsx`

### Criterios de completitud
- [ ] Resumen Ejecutivo carga en < 3s con los 6 KPIs correctos
- [ ] Filtros de fecha y canal actualizan todas las gráficas
- [ ] Búsqueda en Venta Cruzada devuelve resultados en < 1s
- [ ] AccionCajaPanel muestra recomendación en lenguaje simple
- [ ] ChurnTable muestra solo clientes con ≥3 compras, excluye anónimo
- [ ] Exportar CSV de Churn descarga archivo con tildes correctas en Excel
- [ ] ReposicionTable filtra correctamente por estado
- [ ] Exportar CSV de Reposición descarga con teléfono incluido
- [ ] Badge de churn alto en TopBar refleja el conteo correcto

### Dependencias
- Unit 1 (componentes base, auth, tipos)
- Unit 2 (archivos JSON en `public/data/`)

---

## Unit 4 — Módulos Fase 2 (Dashboard)

**Descripción**: Los 2 módulos de inteligencia avanzada para segmentación de clientes y análisis estratégico del portafolio.

### Entregables

#### Módulo 2.1 — Segmentación VIP / RFM
- `src/app/vip/page.tsx`
- `src/components/charts/ScatterRFM.tsx`
- `src/components/tables/VIPTable.tsx`

#### Módulo 2.2 — Productos Gancho
- `src/app/gancho/page.tsx`
- `src/components/charts/BubbleGancho.tsx`
- `src/components/tables/GanchoTable.tsx`

### Criterios de completitud
- [ ] Scatter plot RFM renderiza con colores por segmento correctos
- [ ] Hover en scatter plot muestra nombre, segmento y CLV del cliente
- [ ] Clic en cliente abre ClienteDetailPanel con historial y tendencia
- [ ] Filtro por segmento actualiza tabla y scatter plot simultáneamente
- [ ] Bubble chart de Gancho renderiza con tamaño de burbuja proporcional al ticket
- [ ] Filtro por categoría de gancho actualiza tabla y bubble chart
- [ ] CLV estimado anual se muestra en formato COP correcto

### Dependencias
- Unit 1 (componentes base, auth, tipos)
- Unit 2 (archivos JSON en `public/data/`)
- Unit 3 (no dependencia directa, pero se desarrolla después para garantizar consistencia visual)
