# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## Sellix AI
### Plataforma de Inteligencia de Ventas para Droguerías y Comercio Farmacéutico

**Versión:** 1.1
**Fecha:** Abril 2026
**Autor:** Juan David Herrera
**Empresa:** Next AI Tech LLC
**Estado:** Implementado — MVP completo (Fase 1 + Fase 2)
**Tipo de producto:** SaaS · Analytics · IA Predictiva · Dashboard Comercial
**Última actualización:** 01/04/2026 — Refleja estado real de implementación

---

## 1. RESUMEN EJECUTIVO

Sellix AI es una plataforma SaaS de inteligencia de ventas basada en inteligencia artificial, diseñada para transformar los datos históricos de transacciones de droguerías y establecimientos farmacéuticos en decisiones comerciales concretas y accionables.

La plataforma permite al gerente y al personal de ventas anticipar el comportamiento del cliente, detectar oportunidades de ingreso no aprovechadas, proteger la base de clientes recurrentes y optimizar el portafolio de productos — todo desde un dashboard web interactivo en español, sin necesidad de conocimientos técnicos.

**Cliente piloto:** Droguería Super Ofertas — Barranquilla, Colombia
**Modelo de escala:** SaaS multi-tenant para droguerías independientes y cadenas en Latinoamérica
**Presentado por:** Next AI Tech LLC — Miami, Florida

---

## 2. VISIÓN DEL PRODUCTO

Convertir a Sellix AI en la plataforma de referencia de inteligencia comercial para el canal farmacéutico independiente en Latinoamérica, permitiendo que cualquier droguería — sin importar su tamaño — tome decisiones de ventas basadas en datos con el mismo nivel de sofisticación que las grandes cadenas.

---

## 3. PROBLEMA A RESOLVER

Las droguerías independientes en Colombia y Latinoamérica acumulan años de datos transaccionales en sus sistemas POS y ERP, pero no los utilizan para tomar decisiones comerciales. El resultado es:

- **Pérdida silenciosa de clientes recurrentes** sin ninguna alerta temprana
- **Cero aprovechamiento de venta cruzada** — el cajero no sabe qué recomendar
- **Reposición reactiva** — el cliente llama a preguntar, no la droguería a ofrecer
- **Desconocimiento del valor real de cada cliente** — todos se tratan igual
- **Inventario gestionado por intuición**, no por datos de demanda
- **Portafolio sin estrategia** — no se sabe cuáles productos generan tráfico y cuáles arrastran ventas

Sellix AI resuelve todos estos problemas convirtiendo datos ya existentes en inteligencia accionable, sin requerir inversión en infraestructura adicional.

---

## 4. OBJETIVOS DEL NEGOCIO

### Objetivos estratégicos

1. Incrementar ingresos recurrentes protegiendo la base de clientes habituales
2. Aumentar el ticket promedio por transacción mediante venta cruzada inteligente
3. Mejorar la frecuencia de recompra con recordatorios predictivos de reposición
4. Reducir el abandono (churn) de clientes de alto valor
5. Convertir los datos históricos en ventaja competitiva real
6. Escalar el modelo como SaaS a múltiples droguerías en la región

### KPIs meta (horizonte 12 meses desde implementación)

| Indicador | Meta |
|---|---|
| Reducción de churn en clientes recurrentes | -30% |
| Incremento de ticket promedio | +20% |
| Aumento en frecuencia de recompra | +25% |
| Clientes VIP retenidos activamente | +40% |
| Tiempo de respuesta comercial al cliente | -60% |

### North Star Metric

> **Ingresos recurrentes protegidos + ticket promedio incrementado por cliente identificado**

---

## 5. USUARIOS OBJETIVO

### 5.1 Usuario Primario — Gerente / Propietario de la Droguería

**Perfil:**
- Empresario con 10–30 años en el sector farmacéutico
- Maneja múltiples responsabilidades simultáneas
- No tiene formación técnica en datos o programación
- Toma decisiones basado en experiencia e intuición
- Necesita información clara, rápida y accionable

**Necesidades:**
- Ver el estado del negocio de un vistazo
- Saber quiénes son sus clientes más valiosos y si están en riesgo
- Identificar oportunidades de ingreso que hoy no está aprovechando
- Tomar decisiones con respaldo de datos, no solo intuición

---

### 5.2 Usuario Secundario — Personal de Caja / Vendedor

**Perfil:**
- Atiende entre 50–200 clientes por día
- Opera bajo presión de tiempo en el punto de venta
- No tiene acceso a información del historial del cliente
- Su rol es ejecutar, no analizar

**Necesidades:**
- Saber en el momento de la venta qué producto adicional ofrecer
- Identificar si el cliente frente a él está en lista de seguimiento
- Consultas rápidas, sin fricción, sin análisis complejos

---

### 5.3 Usuario Futuro (Fase SaaS) — Consultor / Next AI Tech

**Perfil:**
- Consultor externo que implementa Sellix AI en múltiples clientes
- Necesita vista multi-tenant y comparativas entre establecimientos

---

## 6. ALCANCE FUNCIONAL — FASE 1

### Módulo 1.1 — Resumen Ejecutivo

**Objetivo:** Dar al gerente una visión completa del negocio en un solo pantallazo.

**KPIs en tarjetas superiores:**

| KPI | Fuente de datos |
|---|---|
| Total de transacciones en el período | Ventas + Remisiones |
| Clientes únicos identificados | Cédulas válidas en ambos archivos |
| Ingresos totales (Valor Venta Neta) | Campo `Valor Venta Neta` |
| Ticket promedio por transacción | Ingresos / Transacciones |
| Clientes en riesgo de abandono | Output del Módulo 1.3 |
| Oportunidades de venta cruzada detectadas | Output del Módulo 1.2 |

**Gráficas requeridas:**
- Ventas por mes (barras) — eje X: mes, eje Y: ingresos totales
- Top 10 productos por ingresos (barras horizontales)
- Distribución de clientes por frecuencia de compra (histograma)

**Filtros:**
- Rango de fechas (date picker)
- Canal de venta: Mostrador / Domicilio / Todos

**Reglas de negocio:**
- Excluir transacciones con `Identificación = 222222222222` (consumidor final anónimo) de los análisis de clientes, pero incluirlas en análisis de productos
- Formatear valores en COP con punto de miles ($1.500.000)
- Fechas en formato DD/MM/YYYY

---

### Módulo 1.2 — Detección de Oportunidades de Venta Cruzada

**Objetivo:** Identificar qué productos se compran juntos para hacer recomendaciones accionables en caja.

**Lógica de cálculo (ETL Python):**

1. Agrupar transacciones por sesión de compra (`Consecutivo Movimiento` en Ventas, `Remision` en Remisiones)
2. Calcular coocurrencia de productos por sesión
3. Calcular métricas de asociación:
   - **Soporte** = frecuencia del par (A, B) sobre total de sesiones
   - **Confianza** = P(B | A) = sesiones con A y B / sesiones con A
   - **Lift** = Confianza / P(B) — pares con Lift > 1.5 son relevantes
4. Estimar incremento de ticket: ticket promedio cuando B acompaña a A vs. ticket sin B

**Requerimientos funcionales:**

**FR-101 Tabla principal de asociaciones**
Columnas: `Producto base` · `Producto recomendado` · `Veces juntos` · `Lift` · `Confianza (%)` · `Incremento est. ticket`

**FR-102 Buscador por producto**
El cajero puede escribir el nombre del producto que está vendiendo y ver las recomendaciones inmediatas.

**FR-103 Panel de acción en caja**
Texto plano sin jerga técnica: "Cuando alguien compra **Valsartán 160mg**, ofrécele también **Losartán 50mg** — aumenta el ticket promedio en ~$12.000"

**FR-104 Filtro por categoría terapéutica**
Agrupar recomendaciones por categoría para facilitar búsqueda.

---

### Módulo 1.3 — Riesgo de Abandono (Churn)

**Objetivo:** Detectar clientes identificados que llevan más tiempo del esperado sin comprar y activar acciones preventivas.

**Lógica de cálculo (ETL Python):**

Para cada cliente con cédula válida y al menos 3 compras históricas:

1. `frecuencia_promedio_dias` = promedio de días entre compras consecutivas
2. `dias_desde_ultima_compra` = fecha de referencia − última fecha de compra
3. `churn_score` = `dias_desde_ultima_compra / frecuencia_promedio_dias`

**Clasificación de riesgo:**

| Churn Score | Nivel | Acción sugerida |
|---|---|---|
| ≥ 2.0 | 🔴 Alto | Llamar esta semana |
| 1.3 – 1.99 | 🟡 Medio | Enviar WhatsApp |
| < 1.3 | 🟢 Bajo | Monitorear |

**Requerimientos funcionales:**

**FR-201 Tabla de riesgo de abandono**
Columnas: `Cliente` · `Cédula` · `Última compra` · `Frecuencia habitual (días)` · `Días sin comprar` · `Score` · `Nivel de riesgo` · `Acción sugerida`

**FR-202 Filtro por nivel de riesgo**
Alto / Medio / Bajo / Todos

**FR-203 Exportar a CSV**
Lista completa para que el equipo haga seguimiento manual por WhatsApp u otros canales.

**FR-204 Contador en el header**
Número de clientes en riesgo alto siempre visible en la barra superior del dashboard.

---

### Módulo 1.4 — Retención Activa (Predicción de Reposición)

**Objetivo:** Anticipar cuándo un cliente necesitará reponer su medicamento habitual y contactarlo antes de que lo solicite.

**Lógica de cálculo (ETL Python):**

Para cada par `(cliente, producto)` con al menos 2 compras:

1. `dias_entre_compras` = promedio de días entre compras del mismo producto por el mismo cliente
2. `proxima_compra_estimada` = última compra + dias_entre_compras
3. `dias_para_reposicion` = proxima_compra_estimada − fecha de referencia

**Clasificación de estado:**

| Días para reposición | Estado | Color |
|---|---|---|
| Negativo (ya venció) | Vencido | 🔴 |
| 0 – 7 días | Esta semana | 🟡 |
| 8 – 30 días | Próximo mes | 🟢 |

**Definición de producto crónico:**
Producto que aparece en Remisiones (canal domicilio) O comprado por el mismo cliente más de 3 veces en el período de análisis.

**Requerimientos funcionales:**

**FR-301 Tabla de próximas reposiciones**
Columnas: `Cliente` · `Teléfono` · `Producto` · `Última compra` · `Ciclo habitual (días)` · `Próxima reposición estimada` · `Estado`

**FR-302 Filtro por estado**
Vencido / Esta semana / Próximo mes / Todos

**FR-303 Buscador por cliente o producto**

**FR-304 Exportar a CSV**
Lista lista para acción de contacto comercial.

---

## 7. ALCANCE FUNCIONAL — FASE 2

### Módulo 2.1 — Segmentación y Protección de Clientes VIP

**Objetivo:** Identificar los clientes de mayor valor y priorizarlos en todas las acciones comerciales.

**Lógica de segmentación RFM (ETL Python):**

Para cada cliente con cédula válida calcular:
- **R (Recency):** días desde la última compra (menor valor = mejor)
- **F (Frequency):** número total de compras en el período
- **M (Monetary):** suma total de Valor Venta Neta

Escalar cada dimensión en quintiles (1–5) y asignar segmento:

| Segmento | Criterio RFM | Prioridad |
|---|---|---|
| VIP (A) | R≥4, F≥4, M≥4 | Máxima |
| Leal (B) | Combinaciones medias-altas | Alta |
| En desarrollo (C) | Potencial pero baja frecuencia o ticket | Media |
| En riesgo (D) | R bajo — no compran hace mucho | Urgente |

**CLV estimado (proyección anual simple):**
`CLV = ticket_promedio × frecuencia_mensual × 12`

**Requerimientos funcionales:**

**FR-401 Scatter plot RFM interactivo**
- Eje X: Frecuencia
- Eje Y: Valor total
- Tamaño de burbuja: Recency invertida
- Color: Segmento (A/B/C/D)

**FR-402 Tabla de clientes segmentados**
Columnas: `Cliente` · `Segmento` · `CLV estimado` · `Ticket promedio` · `Frecuencia` · `Última compra` · `Riesgo churn`

**FR-403 Panel de detalle por cliente**
Al hacer clic en un cliente: historial de compras, productos frecuentes, tendencia de gasto, nivel de riesgo.

**FR-404 Filtro por segmento**
VIP / Leal / En desarrollo / En riesgo / Todos

---

### Módulo 2.2 — Productos Gancho

**Objetivo:** Identificar los productos que generan mayor tráfico y arrastran compras adicionales para diseñar promociones estratégicas.

**Lógica de cálculo (ETL Python):**

1. **Índice de atracción:** número de sesiones únicas en que aparece el producto
2. **Poder de arrastre:** promedio de productos adicionales comprados en la misma sesión que incluye este producto
3. **Elasticidad simple:** variación en cantidad vendida cuando existe descuento (`Lista Precio Cliente ≠ Lista Precio Factura`)

**Categorización automática:**

| Categoría | Criterio |
|---|---|
| Gancho Primario | Alta frecuencia + alto arrastre |
| Gancho Secundario | Alta frecuencia + arrastre medio |
| Volumen puro | Alta frecuencia + bajo arrastre |
| Nicho estratégico | Baja frecuencia + alto ticket |

**Requerimientos funcionales:**

**FR-501 Tabla de productos gancho**
Columnas: `Producto` · `Categoría` · `Frec. de aparición` · `Poder de arrastre` · `¿Tiene descuento frecuente?` · `Ticket promedio cuando aparece`

**FR-502 Mapa de burbujas**
Eje X: Frecuencia de aparición — Eje Y: Poder de arrastre — Tamaño: Ticket promedio

**FR-503 Filtro por categoría de gancho**

---

## 8. ARQUITECTURA TÉCNICA

### 8.1 Stack Tecnológico

| Capa | Tecnología | Versión | Justificación |
|---|---|---|---|
| Frontend | Next.js (App Router) + TypeScript | 14.2.20 / TS 5.7.2 | SSG para velocidad, routing nativo, ecosistema maduro |
| Estilos | Tailwind CSS | 3.4.17 | Productividad, consistencia, mobile-first |
| Gráficas | Recharts | 2.15.0 | Composable, compatible con React, sin dependencias pesadas |
| Tablas | TanStack Table v8 | 8.20.5 | Filtros, sorting, paginación, exportación CSV |
| Autenticación | NextAuth.js v5 + bcryptjs | 5.0.0-beta.25 / 2.4.3 | JWT sessions, rate limiting, seguridad enterprise |
| Iconos | Lucide React | 0.462.0 | Iconografía consistente, tree-shakeable |
| ETL / Análisis | Python 3.11+ · pandas · openpyxl | pandas 2.2.3 / openpyxl 3.1.5 | Procesamiento robusto de Excel, análisis vectorizado |
| Datos en runtime | JSON estáticos en `public/data/` | — | Sin DB en Fase 1, carga instantánea |
| Idioma UI | Español colombiano 100% | — | Usuario final no anglófono |

### 8.2 Estructura de Carpetas

```
sellix-ai/
├── data/
│   ├── raw/                          ← Archivos Excel originales (no versionados)
│   │   ├── Ventas_Superofertas.xlsx
│   │   └── Remisiones_Mayo_Octubre_Superofertas.xlsx
│   ├── processed/                    ← Intermedio del ETL
│   └── uploads/                      ← Archivos subidos por el usuario
├── scripts/
│   ├── etl.py                        ← Script único que genera todos los JSON
│   └── requirements.txt              ← Dependencias Python (pandas, openpyxl)
├── public/
│   └── data/                         ← JSON pre-calculados servidos estáticamente
│       ├── kpis_resumen.json
│       ├── ventas_mensuales.json
│       ├── top_productos.json
│       ├── ventas_cruzadas.json
│       ├── churn_clientes.json
│       ├── reposicion_pendiente.json
│       ├── clientes_rfm.json
│       └── productos_gancho.json
├── src/
│   ├── app/
│   │   ├── layout.tsx                ← Shell: RoleProvider + AppShell (Sidebar + TopBar)
│   │   ├── page.tsx                  ← Módulo 1.1: Resumen Ejecutivo
│   │   ├── cruzada/page.tsx          ← Módulo 1.2: Venta Cruzada
│   │   ├── churn/page.tsx            ← Módulo 1.3: Riesgo de Abandono
│   │   ├── reposicion/page.tsx       ← Módulo 1.4: Retención Activa
│   │   ├── vip/page.tsx              ← Módulo 2.1: Clientes VIP/RFM
│   │   ├── gancho/page.tsx           ← Módulo 2.2: Productos Gancho
│   │   ├── upload/page.tsx           ← Gestión de archivos Excel (upload)
│   │   ├── auth/signin/page.tsx      ← Pantalla de inicio de sesión
│   │   ├── api/auth/[...nextauth]/   ← NextAuth route handlers
│   │   ├── api/upload/               ← API de carga de archivos
│   │   ├── error.tsx                 ← Error boundary (fail-closed)
│   │   ├── global-error.tsx          ← Error boundary global
│   │   └── not-found.tsx             ← Página 404
│   ├── components/
│   │   ├── cajero/
│   │   │   └── CajeroHome.tsx        ← Vista simplificada para cajero
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx           ← Navegación 6 módulos + logout
│   │   │   ├── TopBar.tsx            ← Badge churn + usuario + logout
│   │   │   ├── AppShell.tsx          ← Wrapper principal del layout
│   │   │   ├── HomeRouter.tsx        ← Routing por rol (admin/cajero)
│   │   │   └── AdminOnly.tsx         ← Guard de autorización
│   │   ├── charts/
│   │   │   ├── VentasMensualesChart.tsx    ← Ventas por mes (barras)
│   │   │   ├── TopProductosChart.tsx       ← Top 10 productos (barras horiz.)
│   │   │   ├── FrecuenciaHistogram.tsx     ← Distribución frecuencia de compra
│   │   │   ├── ScatterRFM.tsx             ← Scatter RFM interactivo
│   │   │   └── BubbleGancho.tsx           ← Mapa de burbujas productos gancho
│   │   ├── tables/
│   │   │   ├── ChurnTable.tsx             ← Tabla riesgo + drawer detalle + CSV
│   │   │   ├── ReposicionTable.tsx        ← Tabs estado + búsqueda + CSV
│   │   │   ├── VentaCruzadaTable.tsx      ← Búsqueda + CajaPanel
│   │   │   ├── VIPTable.tsx               ← Scores RFM + CLV + filtro segmento
│   │   │   └── GanchoTable.tsx            ← Barras arrastre + filtro categoría
│   │   └── ui/
│   │       ├── KPICard.tsx                ← 6 variantes (COP, %, días, score, etc.)
│   │       ├── RiskBadge.tsx              ← Badges Alto/Medio/Bajo
│   │       ├── FilterBar.tsx              ← Búsqueda + dropdown + rango fechas
│   │       ├── SearchInput.tsx            ← Input con debounce 300ms + clear
│   │       ├── ExportButton.tsx           ← CSV UTF-8 con BOM (compatible Excel)
│   │       ├── AccionCajaPanel.tsx        ← Texto plano para cajero
│   │       └── ClienteDetailPanel.tsx     ← Drawer lateral detalle cliente
│   ├── lib/
│   │   ├── types.ts                  ← 10 interfaces TypeScript
│   │   ├── formatters.ts             ← COP, fechas DD/MM/YYYY, porcentajes
│   │   ├── dataService.ts            ← 8 funciones fetch para JSON
│   │   ├── authConfig.ts             ← Configuración NextAuth (JWT, bcrypt)
│   │   ├── logger.ts                 ← Logging estructurado JSON
│   │   ├── rateLimiter.ts            ← Rate limiting (5 intentos → 15min bloqueo)
│   │   └── RoleContext.tsx           ← Contexto de roles (admin/cajero)
│   ├── middleware.ts                 ← Guard JWT (Edge Runtime) — deshabilitado en MVP
│   └── auth.ts                       ← Instancia NextAuth v5
├── .env.local.example                ← Template variables de entorno
└── README.md
```

### 8.3 Pipeline de Datos

```
Excel Ventas (17.721 filas)  ──┐
                                ├──→  etl.py  ──→  8 archivos JSON  ──→  Next.js (SSG)
Excel Remisiones (2.582 filas) ─┘
```

**Flujo del ETL (`scripts/etl.py`):**

1. Cargar ambos archivos con `pandas` y normalizar columnas
2. Ejecutar `resumen_calidad_datos()` — validación de integridad antes de procesar
3. Filtrar consumidor final (`Identificación = 222222222222`) de modelos de clientes
4. Calcular módulo por módulo y serializar a JSON en `public/data/`
5. Fecha de referencia fija: **31 de octubre 2025** (última fecha del dataset)

**Función `resumen_calidad_datos()` — output esperado:**
```
=== SELLIX AI — RESUMEN DE CALIDAD DE DATOS ===
Ventas: 17.721 registros | Mayo 2 – Oct 31, 2025
Remisiones: 2.582 registros | Mayo 2 – Oct 31, 2025
Clientes identificados: 957 (99.9% con cédula válida)
Clientes anónimos (consumidor final): 1 ID excluido del CRM
Productos únicos: 3.268 SKUs en Ventas | 1.156 en Remisiones
Clientes con ≥3 compras (aptos para churn): 234
Pares cliente-producto aptos para reposición: 891
Campos con valores nulos: Dirección (43%), Teléfono (12%)
```

### 8.4 Modelo de Datos — Interfaces TypeScript principales

> **Nota:** Los JSON almacenan fechas en formato ISO (`YYYY-MM-DD`). La conversión a `DD/MM/YYYY` ocurre en la capa UI mediante `formatters.ts`.

```typescript
// kpis_resumen.json
interface KPIsResumen {
  total_transacciones: number
  clientes_unicos: number
  ingresos_totales: number
  ticket_promedio: number
  clientes_en_riesgo_alto: number
  oportunidades_cruzada: number
  periodo: string              // Descripción del período analizado
}

// churn_clientes.json
interface ClienteChurn {
  cedula: string
  nombre: string
  telefono: string | null
  ultima_compra: string        // YYYY-MM-DD (formateado a DD/MM/YYYY en UI)
  frecuencia_promedio_dias: number
  dias_sin_comprar: number
  churn_score: number
  nivel_riesgo: 'Alto' | 'Medio' | 'Bajo'
  accion_sugerida: string
}

// reposicion_pendiente.json
interface ReposicionPendiente {
  cedula: string
  nombre: string
  telefono: string | null
  producto: string
  ultima_compra: string        // YYYY-MM-DD
  ciclo_dias: number
  proxima_reposicion: string   // YYYY-MM-DD
  dias_para_reposicion: number
  estado: 'Vencido' | 'Esta semana' | 'Próximo mes'
  historial_compras: string[]  // Fechas de compras previas
  intervalos_dias: number[]    // Días entre cada compra consecutiva
}

// ventas_cruzadas.json
interface VentaCruzada {
  producto_base: string
  producto_recomendado: string
  veces_juntos: number
  lift: number
  confianza: number            // 0–1
  incremento_ticket_estimado: number
  categoria_terapeutica?: string  // Categoría para filtrado
}

// clientes_rfm.json
interface ClienteRFM {
  cedula: string
  nombre: string
  telefono: string | null
  recency_dias: number
  frequency: number
  monetary: number
  score_r: number              // 1–5
  score_f: number              // 1–5
  score_m: number              // 1–5
  segmento: 'VIP' | 'Leal' | 'En desarrollo' | 'En riesgo'
  clv_estimado_anual: number
  ticket_promedio: number
  ultima_compra: string        // YYYY-MM-DD
  churn_score: number
}

// productos_gancho.json
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

### 8.5 Seguridad Implementada

| ID | Medida | Implementación |
|---|---|---|
| SEC-01 | Autenticación | NextAuth.js v5 con proveedor Credentials + bcryptjs |
| SEC-02 | Sesiones JWT | Tokens de 8 horas, cookies HttpOnly + SameSite=lax |
| SEC-03 | Rate Limiting | 5 intentos fallidos → bloqueo de IP por 15 minutos |
| SEC-04 | Logging estructurado | JSON a stdout, nunca registra contraseñas ni cédulas |
| SEC-05 | Headers HTTP | CSP, HSTS con preload, X-Frame-Options: DENY, X-Content-Type-Options: nosniff |
| SEC-06 | Permisos del navegador | Cámara, micrófono y geolocalización deshabilitados vía Permissions-Policy |
| SEC-07 | Error boundaries | Páginas error.tsx, global-error.tsx, not-found.tsx (patrón fail-closed) |
| SEC-08 | Mensajes genéricos | Errores de autenticación no revelan si el usuario o la contraseña son incorrectos |
| SEC-09 | Dependencias fijas | Versiones exactas en package-lock.json (sin rangos) |
| SEC-10 | Middleware Edge | Guard JWT en Edge Runtime (preparado, deshabilitado en MVP) |

**Estado actual:** La infraestructura de seguridad está completamente implementada. El middleware de autenticación está **deshabilitado** para el MVP (matcher vacío) pero puede activarse cambiando la configuración del matcher en `src/middleware.ts`.

### 8.6 Sistema de Roles

| Rol | Acceso | Implementación |
|---|---|---|
| `admin` | Todos los módulos + gestión de archivos | Vista completa del dashboard |
| `cajero` | Vista simplificada de venta cruzada y reposición | `CajeroHome.tsx` — solo información accionable en punto de venta |

El cambio de rol se gestiona mediante `RoleContext.tsx` con persistencia en localStorage. Los componentes `AdminOnly` y `HomeRouter` controlan el acceso según el rol activo.

### 8.7 Convenciones de Diseño UI

| Elemento | Valor |
|---|---|
| Color primario | `#185FA5` (azul) |
| Riesgo alto / alerta | `#E24B4A` (rojo) |
| Riesgo medio | `#EF9F27` (ámbar) |
| OK / positivo | `#3B6D11` (verde) |
| Tipografía | Inter / Geist (default Next.js) |
| Moneda | COP — formato `$1.500.000` |
| Fechas | `DD/MM/YYYY` |
| Idioma | Español colombiano, sin jerga técnica |
| Responsive | Optimizado para desktop y tablet |
| Sin dark mode | Fase 1 — solo tema claro |

---

## 9. REQUERIMIENTOS NO FUNCIONALES

| ID | Requisito | Criterio | Estado |
|---|---|---|---|
| NFR-001 | Rendimiento | Dashboard carga en < 3 segundos (datos pre-calculados) | ✅ Implementado |
| NFR-002 | Disponibilidad | 99.5% uptime en hosting de producción | ✅ Ready (Vercel) |
| NFR-003 | Reproducibilidad | El ETL produce el mismo output con los mismos datos de entrada | ✅ Implementado |
| NFR-004 | Usabilidad | Un usuario no técnico puede operar el dashboard sin capacitación | ✅ Implementado |
| NFR-005 | Exportación | Tablas de Churn y Reposición exportables a CSV con un clic | ✅ Implementado (UTF-8 + BOM) |
| NFR-006 | Seguridad | Autenticación JWT + rate limiting + headers de seguridad + logging | ✅ Implementado (ver sección 8.5) |
| NFR-007 | Escalabilidad datos | El ETL debe soportar hasta 500.000 registros sin cambios de arquitectura | ✅ Implementado |
| NFR-008 | Compatibilidad CSV | Exportación compatible con Excel (UTF-8 con BOM para caracteres latinos) | ✅ Implementado |
| NFR-009 | Error handling | Error boundaries con patrón fail-closed en todas las rutas | ✅ Implementado |

---

## 10. REGLAS DE NEGOCIO GLOBALES

1. **Cliente recurrente válido** = al menos 2 compras con cédula identificada
2. **Consumidor final anónimo** = `Identificación = 222222222222` — excluido de CRM, incluido en análisis de productos
3. **Producto crónico** = aparece en Remisiones (domicilio) O comprado por el mismo cliente más de 3 veces en 6 meses
4. **Sesión de compra** = mismo `Consecutivo Movimiento` en Ventas / mismo número `Remision` en Remisiones
5. **Moneda** = COP. No convertir a otras monedas
6. **Fecha base de análisis** = 31 de octubre 2025 (última fecha del dataset) — fija para reproducibilidad
7. **Mínimo para churn** = cliente con al menos 3 compras históricas
8. **Mínimo para reposición** = par cliente-producto con al menos 2 compras del mismo SKU

---

## 11. ROADMAP

### Fase 1 — MVP Piloto Super Ofertas ✅ COMPLETADA

| Entregable | Estado |
|---|---|
| ETL Python funcional + validación de datos (8 calculadores) | ✅ |
| Layout Next.js + autenticación + seguridad enterprise | ✅ |
| Módulo 1.1 — Resumen Ejecutivo (6 KPIs + 3 gráficas) | ✅ |
| Módulo 1.2 — Venta Cruzada (tabla + panel de caja + filtros) | ✅ |
| Módulo 1.3 — Riesgo de Abandono (tabla + drawer + CSV + badge) | ✅ |
| Módulo 1.4 — Retención Activa (tabs + búsqueda + CSV) | ✅ |
| Sistema de roles admin/cajero | ✅ |

### Fase 2 — Inteligencia Avanzada ✅ COMPLETADA

| Entregable | Estado |
|---|---|
| Módulo 2.1 — Segmentación VIP/RFM (scatter + tabla + CLV) | ✅ |
| Módulo 2.2 — Productos Gancho (bubble chart + tabla + categorías) | ✅ |
| Página de upload de archivos Excel | ✅ |
| Error boundaries y páginas de error | ✅ |

### Fase 3 — Producto SaaS Multi-tenant (post-piloto)

- Autenticación multi-tenant con aislamiento de datos por cliente
- ~~Upload de archivos Excel desde la propia plataforma~~ → Ya implementado en `/upload`
- Actualización periódica de datos (cron job semanal o mensual)
- Integración directa con sistemas POS colombianos (Siesa, Helisa, World Office)
- Módulo de campañas: generación de listas de contacto segmentadas para WhatsApp
- API REST para consumo desde otros sistemas
- Panel de administración para Next AI Tech (vista de todos los clientes)
- Pricing SaaS: plan por establecimiento o por número de transacciones analizadas
- Activación del middleware de autenticación (actualmente deshabilitado en MVP)

---

## 12. CRITERIOS DE ÉXITO DEL PILOTO

Al finalizar la implementación en Droguería Super Ofertas, el proyecto se considera exitoso si:

1. El dashboard carga correctamente con datos reales en < 3 segundos
2. El módulo de Churn identifica correctamente los clientes ausentes vs. los activos
3. El módulo de Venta Cruzada genera al menos 20 pares de productos con Lift > 1.5
4. El módulo de Reposición predice correctamente la siguiente compra en al menos el 70% de los casos validados manualmente
5. El gerente puede navegar todos los módulos sin asistencia técnica
6. El cliente valida que la información es consistente con su percepción del negocio

---

## 13. FUERA DE ALCANCE (FASE 1 Y 2)

- Integración en tiempo real con sistemas POS o ERP
- Chat conversacional o WhatsApp bot
- Módulo de pagos o transacciones
- Gestión de inventario o pedidos a proveedores
- App móvil nativa
- ~~Autenticación de múltiples usuarios con roles diferenciados~~ → Implementado (admin/cajero)
- Dark mode
- Middleware de autenticación activado en producción (infraestructura lista, deshabilitado en MVP)
- Multi-tenancy con aislamiento de datos por cliente

---

## 14. ENTREGABLES ADICIONALES (FUERA DEL ALCANCE ORIGINAL)

Las siguientes funcionalidades fueron implementadas durante la construcción del MVP aunque no estaban contempladas en la versión original del PRD:

| Funcionalidad | Descripción | Ubicación |
|---|---|---|
| Sistema de roles | Dos roles (admin/cajero) con vistas diferenciadas | `RoleContext.tsx`, `HomeRouter.tsx`, `AdminOnly.tsx` |
| Vista de cajero | Interfaz simplificada para punto de venta | `CajeroHome.tsx` |
| Upload de archivos | Carga de Excel con drag & drop, detección automática de columnas | `/upload`, `/api/upload` |
| Seguridad enterprise | Rate limiting, logging estructurado, headers HTTP, error boundaries | `rateLimiter.ts`, `logger.ts`, `next.config.ts` |
| Autenticación completa | NextAuth v5 con JWT, bcrypt, cookies seguras | `authConfig.ts`, `auth.ts`, `middleware.ts` |
| Histograma de frecuencia | Distribución de clientes por frecuencia de compra | `FrecuenciaHistogram.tsx` |
| Mapa de burbujas gancho | Visualización interactiva de productos gancho | `BubbleGancho.tsx` |
| Drawer de detalle | Panel lateral con historial completo del cliente | `ClienteDetailPanel.tsx` |
| Búsqueda con debounce | Input de búsqueda con delay de 300ms para rendimiento | `SearchInput.tsx` |

---

## 15. INVENTARIO DE ARCHIVOS GENERADOS

### Código fuente: ~50 archivos

| Categoría | Cantidad | Ubicación |
|---|---|---|
| Páginas (rutas) | 10 | `src/app/` |
| Componentes de layout | 5 | `src/components/layout/` |
| Componentes de gráficas | 5 | `src/components/charts/` |
| Componentes de tablas | 5 | `src/components/tables/` |
| Componentes UI reutilizables | 7 | `src/components/ui/` |
| Librerías y utilidades | 7 | `src/lib/` |
| Configuración | 7 | Raíz del proyecto |
| ETL y scripts | 2 | `scripts/` |
| Vista cajero | 1 | `src/components/cajero/` |

### Datos JSON: 8 archivos en `public/data/`

| Archivo | Tamaño aprox. | Registros |
|---|---|---|
| `kpis_resumen.json` | 220B | 1 objeto |
| `ventas_mensuales.json` | 500B | 12 meses |
| `top_productos.json` | 1.3KB | 10 productos |
| `ventas_cruzadas.json` | 25KB | 217+ pares |
| `churn_clientes.json` | 268KB | 234+ clientes |
| `reposicion_pendiente.json` | 132KB | 891+ registros |
| `clientes_rfm.json` | 342KB | 957 clientes |
| `productos_gancho.json` | 840KB | 3.268+ productos |

**Total datos procesados:** 17.721 ventas + 2.582 remisiones = 20.303 registros

---

*Documento preparado por Next AI Tech LLC · Miami, Florida*
*Cliente piloto: Droguería Super Ofertas · Barranquilla, Colombia*
*Sellix AI v1.1 · Abril 2026*
