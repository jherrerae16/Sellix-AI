# Componentes de la Aplicación — Sellix AI

**Arquitectura**: Next.js 14+ App Router (Monolito modular) + ETL Python independiente  
**Patrón**: Component-based UI · Service layer · Static data · Auth middleware

---

## Capa 1 — Layout Shell

### AppShell
- **Tipo**: Server Component (layout.tsx)
- **Propósito**: Envuelve toda la aplicación autenticada con navegación y encabezado
- **Responsabilidades**:
  - Componer Sidebar + TopBar + área de contenido principal
  - Proveer el contexto de sesión NextAuth a todos los hijos
  - Aplicar el tema visual (colores Sellix AI, tipografía Inter/Geist)
  - Manejar el responsive (sidebar colapsable en tablet)

### Sidebar
- **Tipo**: Client Component
- **Propósito**: Navegación principal entre los 6 módulos del dashboard
- **Responsabilidades**:
  - Renderizar enlaces a: Resumen, Venta Cruzada, Churn, Reposición, VIP/RFM, Productos Gancho
  - Marcar el módulo activo visualmente
  - Mostrar logo e identidad Sellix AI
  - Botón de cierre de sesión (NextAuth signOut)

### TopBar
- **Tipo**: Client Component
- **Propósito**: Encabezado superior con estado global y accesos rápidos
- **Responsabilidades**:
  - Mostrar contador de clientes en riesgo alto (badge rojo, datos de churn_clientes.json)
  - Mostrar nombre del usuario autenticado
  - Navegar al módulo de Churn filtrado por "Alto" al clic del badge

---

## Capa 2 — Páginas (App Router)

### DashboardPage (`app/page.tsx`)
- **Módulo**: 1.1 Resumen Ejecutivo
- **Tipo**: Server Component + Client islands
- **Responsabilidades**:
  - Cargar kpis_resumen.json, ventas_mensuales.json, top_productos.json
  - Renderizar 6 KPICards, VentasMensualesChart, TopProductosChart, FrecuenciaHistogram
  - Gestionar filtros de fecha y canal con estado local

### VentaCruzadaPage (`app/cruzada/page.tsx`)
- **Módulo**: 1.2 Detección de Venta Cruzada
- **Tipo**: Server Component + Client islands
- **Responsabilidades**:
  - Cargar ventas_cruzadas.json
  - Renderizar VentaCruzadaTable, SearchInput, panel de acción para cajero (AccionCajaPanel)
  - Gestionar búsqueda por producto y filtro por categoría

### ChurnPage (`app/churn/page.tsx`)
- **Módulo**: 1.3 Riesgo de Abandono
- **Tipo**: Server Component + Client islands
- **Responsabilidades**:
  - Cargar churn_clientes.json
  - Renderizar ChurnTable con filtros de nivel de riesgo y exportación CSV

### ReposicionPage (`app/reposicion/page.tsx`)
- **Módulo**: 1.4 Retención Activa
- **Tipo**: Server Component + Client islands
- **Responsabilidades**:
  - Cargar reposicion_activa.json
  - Renderizar ReposicionTable con filtros de estado, búsqueda y exportación CSV

### VIPPage (`app/vip/page.tsx`)
- **Módulo**: 2.1 Segmentación RFM / VIP
- **Tipo**: Client Component (gráficas interactivas)
- **Responsabilidades**:
  - Cargar segmentacion_rfm.json
  - Renderizar ScatterRFM interactivo, VIPTable, ClienteDetailPanel (drawer)
  - Gestionar filtro por segmento y estado del drawer

### GanchoPage (`app/gancho/page.tsx`)
- **Módulo**: 2.2 Productos Gancho
- **Tipo**: Client Component
- **Responsabilidades**:
  - Cargar productos_gancho.json
  - Renderizar GanchoTable, BubbleGancho
  - Gestionar filtro por categoría de gancho

### LoginPage (`app/auth/signin/page.tsx`)
- **Tipo**: Client Component
- **Responsabilidades**:
  - Formulario de login (usuario + contraseña)
  - Llamar a NextAuth signIn()
  - Mostrar errores genéricos (sin revelar detalles internos)
  - UI en español colombiano

---

## Capa 3 — Componentes de UI Reutilizables (`src/components/ui/`)

### KPICard
- **Propósito**: Tarjeta de métrica con etiqueta, valor y color de estado opcional
- **Responsabilidades**: Formatear valor (COP, número, porcentaje), aplicar color según tipo de métrica

### RiskBadge
- **Propósito**: Etiqueta visual de nivel de riesgo
- **Responsabilidades**: Mapear nivel (Alto/Medio/Bajo/Vencido/Esta semana/Próximo mes) a color (#E24B4A / #EF9F27 / #3B6D11)

### FilterBar
- **Propósito**: Barra de filtros composable reutilizable
- **Responsabilidades**: Renderizar date picker, dropdowns y botones de filtro; emitir onChange al padre

### SearchInput
- **Propósito**: Campo de búsqueda con debounce
- **Responsabilidades**: Debounce de 300ms, limpiar búsqueda, emitir onChange al padre

### ExportButton
- **Propósito**: Botón de exportación CSV
- **Responsabilidades**: Recibir datos y nombre de archivo, generar y descargar CSV con encoding UTF-8

### AccionCajaPanel
- **Propósito**: Panel de recomendación en lenguaje simple para el cajero
- **Responsabilidades**: Transformar datos de asociación en frase accionable sin jerga técnica

### ClienteDetailPanel
- **Propósito**: Panel lateral (drawer) con historial detallado de cliente
- **Responsabilidades**: Mostrar historial cronológico, top productos, tendencia de gasto mensual

---

## Capa 4 — Componentes de Gráficas (`src/components/charts/`)

### VentasMensualesChart
- **Propósito**: Gráfica de barras de ventas por mes
- **Responsabilidades**: Renderizar BarChart de Recharts con tooltip COP y eje X de meses

### TopProductosChart
- **Propósito**: Gráfica horizontal de top 10 productos por ingreso
- **Responsabilidades**: Renderizar BarChart horizontal con nombres de productos y valores COP

### FrecuenciaHistogram
- **Propósito**: Histograma de distribución de clientes por frecuencia de compra
- **Responsabilidades**: Agrupar clientes en rangos de frecuencia y renderizar BarChart

### ScatterRFM
- **Propósito**: Scatter plot interactivo de segmentación RFM
- **Responsabilidades**: Renderizar ScatterChart de Recharts con tamaño de burbuja (recency), color por segmento, tooltip con detalle de cliente

### BubbleGancho
- **Propósito**: Mapa de burbujas de productos gancho
- **Responsabilidades**: Renderizar ScatterChart con eje X frecuencia, eje Y arrastre, tamaño ticket promedio

---

## Capa 5 — Componentes de Tablas (`src/components/tables/`)

### ChurnTable
- **Propósito**: Tabla de riesgo de abandono con TanStack Table v8
- **Responsabilidades**: Columnas (Nombre, Cédula, Última compra, Frecuencia, Días, Score, Nivel, Acción), filtro por nivel, ordenamiento, paginación, exportación CSV

### ReposicionTable
- **Propósito**: Tabla de próximas reposiciones
- **Responsabilidades**: Columnas (Cliente, Teléfono, Producto, Última compra, Ciclo, Próxima reposición, Estado), filtro estado, búsqueda, exportación CSV

### VentaCruzadaTable
- **Propósito**: Tabla de asociaciones de venta cruzada
- **Responsabilidades**: Columnas (Producto base, Recomendado, Veces juntos, Lift, Confianza %, Incremento ticket), filtro categoría, búsqueda por producto

### VIPTable
- **Propósito**: Tabla de clientes segmentados RFM
- **Responsabilidades**: Columnas (Cliente, Segmento, CLV, Ticket promedio, Frecuencia, Última compra, Churn), filtro segmento, clic para detalle

### GanchoTable
- **Propósito**: Tabla de productos gancho
- **Responsabilidades**: Columnas (Producto, Categoría, Frecuencia, Arrastre, Descuento, Ticket sesión), filtro categoría

---

## Capa 6 — Biblioteca (`src/lib/`)

### types.ts
- **Propósito**: Interfaces TypeScript para todos los modelos de datos JSON
- **Responsabilidades**: Definir KPIsResumen, ClienteChurn, ReposicionPendiente, VentaCruzada, ClienteRFM, ProductoGancho, VentaMensual, TopProducto

### formatters.ts
- **Propósito**: Funciones de formato de presentación
- **Responsabilidades**: formatCOP(), formatDate(), formatPercent(), formatScore()

### dataService.ts
- **Propósito**: Capa de acceso a datos JSON estáticos
- **Responsabilidades**: Funciones de fetch con caché del navegador para cada JSON de public/data/

### authConfig.ts
- **Propósito**: Configuración de NextAuth.js
- **Responsabilidades**: Provider de credenciales, validación de usuario/contraseña, configuración de sesión (expiración 8h, cookies seguras)

### rateLimiter.ts
- **Propósito**: Rate limiting para el endpoint de login (SECURITY-11)
- **Responsabilidades**: Contador de intentos fallidos por IP, bloqueo temporal tras 5 intentos

### logger.ts
- **Propósito**: Logging estructurado (SECURITY-03)
- **Responsabilidades**: Función log() con timestamp, nivel, correlationId, mensaje; sin PII ni secrets

---

## Capa 7 — Middleware (`src/middleware.ts`)

### AuthMiddleware
- **Propósito**: Proteger todas las rutas del dashboard (SECURITY-08)
- **Responsabilidades**: Interceptar todas las requests, verificar sesión NextAuth, redirigir a /auth/signin si no autenticado, excluir rutas públicas (/auth/*)

---

## Capa 8 — ETL Pipeline (`scripts/etl.py`)

### ETLPipeline
- **Tipo**: Script Python standalone
- **Propósito**: Transformar archivos Excel en 8 JSON estáticos para el dashboard
- **Responsabilidades**:
  - Cargar y normalizar datos de Ventas y Remisiones
  - Ejecutar resumen_calidad_datos() antes de procesar
  - Calcular los 8 módulos de datos con fecha de referencia fija (2025-10-31)
  - Serializar JSON en public/data/ con logging de progreso
  - Validar integridad del output antes de terminar

---

## Configuración de Infraestructura

### next.config.ts
- **Propósito**: Configuración global de Next.js (SECURITY-04)
- **Responsabilidades**: Headers de seguridad HTTP (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)

### .env.local
- **Propósito**: Variables de entorno sensibles (SECURITY-12)
- **Responsabilidades**: NEXTAUTH_SECRET, NEXTAUTH_URL, credenciales de usuario (hash), nunca versionado
