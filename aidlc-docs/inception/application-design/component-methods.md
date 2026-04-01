# Métodos de Componentes — Sellix AI

**Nota**: Este documento define firmas de métodos e interfaces de alto nivel. La lógica de negocio detallada (algoritmos de scoring, cálculos RFM, market basket analysis) se especifica en Functional Design durante la fase de Construction.

---

## Layout Shell

### AppShell (`app/layout.tsx`)
```typescript
// Server Component — no métodos de instancia
// Props implícitas del layout de Next.js App Router
interface RootLayoutProps {
  children: React.ReactNode
}
```

### Sidebar
```typescript
interface SidebarProps {
  currentPath: string  // Para marcar el ítem activo
}

// Métodos internos:
handleSignOut(): Promise<void>          // Llama NextAuth signOut()
isActive(path: string): boolean        // Compara con currentPath
```

### TopBar
```typescript
interface TopBarProps {
  churnHighRiskCount: number           // Desde kpis_resumen.json
  userName: string                     // Desde sesión NextAuth
}

handleChurnBadgeClick(): void          // Navega a /churn?filter=Alto
```

---

## Páginas

### DashboardPage
```typescript
// Server Component — data fetching en servidor
async function DashboardPage(): Promise<JSX.Element>

// Datos cargados:
getKPIsResumen(): Promise<KPIsResumen>
getVentasMensuales(): Promise<VentaMensual[]>
getTopProductos(): Promise<TopProducto[]>
```

### VentaCruzadaPage
```typescript
async function VentaCruzadaPage(): Promise<JSX.Element>
getVentasCruzadas(): Promise<VentaCruzada[]>
```

### ChurnPage
```typescript
async function ChurnPage(): Promise<JSX.Element>
getChurnClientes(): Promise<ClienteChurn[]>
```

### ReposicionPage
```typescript
async function ReposicionPage(): Promise<JSX.Element>
getReposicionActiva(): Promise<ReposicionPendiente[]>
```

### VIPPage
```typescript
async function VIPPage(): Promise<JSX.Element>
getSegmentacionRFM(): Promise<ClienteRFM[]>
```

### GanchoPage
```typescript
async function GanchoPage(): Promise<JSX.Element>
getProductosGancho(): Promise<ProductoGancho[]>
```

---

## Componentes UI

### KPICard
```typescript
interface KPICardProps {
  label: string
  value: number | string
  format: 'cop' | 'number' | 'percent'
  variant?: 'default' | 'warning' | 'danger'  // Para churn y alertas
  onClick?: () => void
}
```

### RiskBadge
```typescript
interface RiskBadgeProps {
  level: 'Alto' | 'Medio' | 'Bajo' | 'Vencido' | 'Esta semana' | 'Próximo mes'
}
// Retorna: badge coloreado con texto del nivel
```

### FilterBar
```typescript
interface FilterBarProps {
  dateRange?: { from: Date; to: Date }
  onDateRangeChange?: (range: { from: Date; to: Date }) => void
  channelFilter?: 'Mostrador' | 'Domicilio' | 'Todos'
  onChannelChange?: (channel: string) => void
  riskFilter?: 'Alto' | 'Medio' | 'Bajo' | 'Todos'
  onRiskChange?: (level: string) => void
  statusFilter?: 'Vencido' | 'Esta semana' | 'Próximo mes' | 'Todos'
  onStatusChange?: (status: string) => void
  segmentFilter?: 'VIP' | 'Leal' | 'En desarrollo' | 'En riesgo' | 'Todos'
  onSegmentChange?: (segment: string) => void
}
```

### SearchInput
```typescript
interface SearchInputProps {
  placeholder: string
  value: string
  onChange: (value: string) => void
  debounceMs?: number  // Default: 300
}
```

### ExportButton
```typescript
interface ExportButtonProps {
  data: Record<string, unknown>[]
  filename: string                      // Sin extensión — se agrega .csv
  columns: { key: string; header: string }[]
  label?: string                        // Default: "Exportar CSV"
}

handleExport(): void   // Genera Blob CSV UTF-8 y dispara descarga
```

### AccionCajaPanel
```typescript
interface AccionCajaPanelProps {
  productoBase: string
  productoRecomendado: string
  incrementoTicket: number              // En COP
}
// Renderiza: "Cuando alguien compra [base], ofrécele [rec] — aumenta el ticket en ~$XX.000"
```

### ClienteDetailPanel
```typescript
interface ClienteDetailPanelProps {
  cliente: ClienteRFM | null           // null = panel cerrado
  onClose: () => void
}
// Sub-componentes internos:
// - HistorialCompras: lista cronológica
// - TopProductos: top 5 SKUs más comprados
// - TendenciaGasto: mini-chart de gasto mensual
```

---

## Componentes de Gráficas

### VentasMensualesChart
```typescript
interface VentasMensualesChartProps {
  data: VentaMensual[]
  height?: number                       // Default: 300
}
// Recharts BarChart — eje X: mes abreviado, eje Y: ingresos COP
// Tooltip: muestra valor exacto con formatCOP()
```

### TopProductosChart
```typescript
interface TopProductosChartProps {
  data: TopProducto[]
  height?: number                       // Default: 400
}
// Recharts BarChart horizontal — top 10 productos por ingreso
```

### FrecuenciaHistogram
```typescript
interface FrecuenciaHistogramProps {
  data: ClienteChurn[]                  // Usa frecuencia_promedio_dias
  bins?: number                         // Default: 10 rangos
}
```

### ScatterRFM
```typescript
interface ScatterRFMProps {
  data: ClienteRFM[]
  filterSegmento?: string               // Filtra por segmento activo
  onClienteClick: (cliente: ClienteRFM) => void
}
// Recharts ScatterChart
// Eje X: frequency, Eje Y: monetary, Tamaño burbuja: recency_dias inv.
// Color por segmento: VIP=#185FA5, Leal=#3B6D11, En desarrollo=#EF9F27, En riesgo=#E24B4A
```

### BubbleGancho
```typescript
interface BubbleGanchoProps {
  data: ProductoGancho[]
  filterCategoria?: string
}
// Recharts ScatterChart
// Eje X: indice_atraccion, Eje Y: poder_arrastre, Tamaño: ticket_promedio_en_sesion
// Color por categoria_gancho
```

---

## Componentes de Tablas

### ChurnTable
```typescript
interface ChurnTableProps {
  data: ClienteChurn[]
  filterNivel?: 'Alto' | 'Medio' | 'Bajo' | 'Todos'
}

// TanStack Table v8 — columns:
// nombre | cedula | ultima_compra | frecuencia_promedio_dias | dias_sin_comprar | churn_score | nivel_riesgo (RiskBadge) | accion_sugerida
// Features: sorting, pagination, CSV export
```

### ReposicionTable
```typescript
interface ReposicionTableProps {
  data: ReposicionPendiente[]
  filterEstado?: 'Vencido' | 'Esta semana' | 'Próximo mes' | 'Todos'
  searchQuery?: string
}

// TanStack Table — columns:
// nombre | telefono | producto | ultima_compra | ciclo_dias | proxima_reposicion | estado (RiskBadge)
// Features: sorting, filtering, search, CSV export
```

### VentaCruzadaTable
```typescript
interface VentaCruzadaTableProps {
  data: VentaCruzada[]
  searchQuery?: string
  filterCategoria?: string
  onRowSelect?: (row: VentaCruzada) => void  // Actualiza AccionCajaPanel
}

// TanStack Table — columns:
// producto_base | producto_recomendado | veces_juntos | lift | confianza (%) | incremento_ticket_estimado (COP)
```

### VIPTable
```typescript
interface VIPTableProps {
  data: ClienteRFM[]
  filterSegmento?: string
  onClienteClick: (cliente: ClienteRFM) => void
}

// TanStack Table — columns:
// nombre | segmento (RiskBadge) | clv_estimado_anual | ticket_promedio | frequency | ultima_compra | churn_score (RiskBadge)
```

### GanchoTable
```typescript
interface GanchoTableProps {
  data: ProductoGancho[]
  filterCategoria?: string
}

// TanStack Table — columns:
// nombre | categoria_gancho | indice_atraccion | poder_arrastre | tiene_descuento_frecuente | ticket_promedio_en_sesion
```

---

## Biblioteca (lib/)

### types.ts — Interfaces TypeScript
```typescript
interface KPIsResumen {
  total_transacciones: number
  clientes_unicos: number
  ingresos_totales: number
  ticket_promedio: number
  clientes_en_riesgo_alto: number
  oportunidades_cruzada: number
  periodo: { desde: string; hasta: string }
}

interface VentaMensual {
  mes: string           // "2025-05"
  mes_label: string     // "Mayo 2025"
  ingresos: number
  transacciones: number
}

interface TopProducto {
  codigo: string
  nombre: string
  ingresos: number
  unidades: number
}

interface ClienteChurn {
  cedula: string
  nombre: string
  telefono: string | null
  ultima_compra: string          // DD/MM/YYYY
  frecuencia_promedio_dias: number
  dias_sin_comprar: number
  churn_score: number
  nivel_riesgo: 'Alto' | 'Medio' | 'Bajo'
  accion_sugerida: string
}

interface ReposicionPendiente {
  cedula: string
  nombre: string
  telefono: string | null
  producto: string
  ultima_compra: string          // DD/MM/YYYY
  ciclo_dias: number
  proxima_reposicion: string     // DD/MM/YYYY
  dias_para_reposicion: number
  estado: 'Vencido' | 'Esta semana' | 'Próximo mes'
}

interface VentaCruzada {
  producto_base: string
  producto_recomendado: string
  veces_juntos: number
  lift: number
  confianza: number              // 0–1
  incremento_ticket_estimado: number
  categoria_terapeutica?: string
}

interface ClienteRFM {
  cedula: string
  nombre: string
  recency_dias: number
  frequency: number
  monetary: number
  score_r: number                // 1–5
  score_f: number                // 1–5
  score_m: number                // 1–5
  segmento: 'VIP' | 'Leal' | 'En desarrollo' | 'En riesgo'
  clv_estimado_anual: number
  churn_score: number
  ticket_promedio: number
  ultima_compra: string          // DD/MM/YYYY
}

interface ProductoGancho {
  codigo: string
  nombre: string
  categoria_gancho: 'Gancho Primario' | 'Gancho Secundario' | 'Volumen puro' | 'Nicho estratégico'
  indice_atraccion: number
  poder_arrastre: number
  tiene_descuento_frecuente: boolean
  ticket_promedio_en_sesion: number
}
```

### formatters.ts
```typescript
formatCOP(value: number): string
// Ejemplo: 1500000 → "$1.500.000"

formatDate(isoDate: string): string
// Ejemplo: "2025-10-31" → "31/10/2025"

formatPercent(value: number): string
// Ejemplo: 0.756 → "75.6%"

formatScore(value: number): string
// Ejemplo: 2.34 → "2.34x"

formatDays(days: number): string
// Ejemplo: 45 → "45 días"
```

### dataService.ts
```typescript
fetchKPIsResumen(): Promise<KPIsResumen>
fetchVentasMensuales(): Promise<VentaMensual[]>
fetchTopProductos(): Promise<TopProducto[]>
fetchVentasCruzadas(): Promise<VentaCruzada[]>
fetchChurnClientes(): Promise<ClienteChurn[]>
fetchReposicionActiva(): Promise<ReposicionPendiente[]>
fetchSegmentacionRFM(): Promise<ClienteRFM[]>
fetchProductosGancho(): Promise<ProductoGancho[]>
// Todos usan fetch() nativo de Next.js con cache: 'force-cache' (SSG)
```

### authConfig.ts
```typescript
// NextAuth.js CredentialsProvider configuration
// - authorize(): valida usuario/contraseña desde env vars hasheadas
// - session.maxAge: 28800 (8 horas)
// - cookies: secure, httpOnly, sameSite: 'lax'
// - pages: { signIn: '/auth/signin' }
```

### rateLimiter.ts
```typescript
checkRateLimit(ip: string): { allowed: boolean; retryAfterMs?: number }
recordFailedAttempt(ip: string): void
resetAttempts(ip: string): void
// Store: Map en memoria (suficiente para MVP de un solo servidor)
// Límite: 5 intentos fallidos → bloqueo 15 minutos
```

### logger.ts
```typescript
interface LogEntry {
  timestamp: string      // ISO 8601
  level: 'info' | 'warn' | 'error'
  correlationId?: string
  message: string
  context?: Record<string, unknown>  // Sin PII, sin secrets
}

log(level: LogEntry['level'], message: string, context?: Record<string, unknown>): void
logAuthEvent(event: 'login_success' | 'login_failure' | 'logout' | 'rate_limited', ip: string): void
logError(error: Error, context?: Record<string, unknown>): void
```

---

## ETL Pipeline (Python)

### etl.py — Funciones principales
```python
def load_data() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Carga Ventas y Remisiones desde data/raw/ y normaliza columnas"""

def resumen_calidad_datos(ventas: pd.DataFrame, remisiones: pd.DataFrame) -> None:
    """Imprime reporte de calidad — detiene el proceso si hay errores críticos"""

def calculate_kpis(ventas: pd.DataFrame, remisiones: pd.DataFrame) -> dict:
    """Calcula KPIsResumen para kpis_resumen.json"""

def calculate_ventas_mensuales(ventas: pd.DataFrame, remisiones: pd.DataFrame) -> list[dict]:
    """Agrupa ingresos por mes para ventas_mensuales.json"""

def calculate_top_productos(ventas: pd.DataFrame, remisiones: pd.DataFrame) -> list[dict]:
    """Top 10 productos por ingresos — incluye consumidor anónimo"""

def calculate_ventas_cruzadas(ventas: pd.DataFrame, remisiones: pd.DataFrame) -> list[dict]:
    """Market basket analysis — soporte, confianza, lift por par de productos"""

def calculate_churn(ventas: pd.DataFrame, remisiones: pd.DataFrame, fecha_ref: date) -> list[dict]:
    """Churn scoring por cliente (mín. 3 compras) — excluye 222222222222"""

def calculate_reposicion(ventas: pd.DataFrame, remisiones: pd.DataFrame, fecha_ref: date) -> list[dict]:
    """Predicción de reposición por par (cliente, producto crónico)"""

def calculate_rfm(ventas: pd.DataFrame, remisiones: pd.DataFrame, fecha_ref: date) -> list[dict]:
    """Segmentación RFM con quintiles y CLV estimado"""

def calculate_gancho(ventas: pd.DataFrame, remisiones: pd.DataFrame) -> list[dict]:
    """Índice de atracción, poder de arrastre y elasticidad por producto"""

def export_json(data: list | dict, filename: str) -> None:
    """Serializa a JSON en public/data/ con manejo de errores"""

def main() -> None:
    """Orquesta el pipeline completo con logging de progreso"""
```
