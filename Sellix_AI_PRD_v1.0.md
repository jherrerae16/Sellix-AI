# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## Sellix AI
### Plataforma de Inteligencia de Ventas para Droguerías y Comercio Farmacéutico

**Versión:** 1.0
**Fecha:** Abril 2026
**Autor:** Juan David Herrera
**Empresa:** Next AI Tech LLC
**Estado:** Documento Maestro
**Tipo de producto:** SaaS · Analytics · IA Predictiva · Dashboard Comercial

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

| Capa | Tecnología | Justificación |
|---|---|---|
| Frontend | Next.js 14+ (App Router) + TypeScript | SSG para velocidad, routing nativo, ecosistema maduro |
| Estilos | Tailwind CSS | Productividad, consistencia, mobile-first |
| Gráficas | Recharts | Composable, compatible con React, sin dependencias pesadas |
| Tablas | TanStack Table v8 | Filtros, sorting, paginación, exportación CSV |
| ETL / Análisis | Python 3.11+ · pandas · openpyxl | Procesamiento robusto de Excel, análisis vectorizado |
| Datos en runtime | JSON estáticos en `public/data/` | Sin DB en Fase 1, carga instantánea |
| Idioma UI | Español colombiano 100% | Usuario final no anglófono |

### 8.2 Estructura de Carpetas

```
sellix-ai/
├── data/
│   ├── raw/                          ← Archivos Excel originales (no versionados)
│   │   ├── Ventas_Superofertas.xlsx
│   │   └── Remisiones_Mayo_Octubre_Superofertas.xlsx
│   └── processed/                    ← Intermedio del ETL
├── scripts/
│   └── etl.py                        ← Script único que genera todos los JSON
├── public/
│   └── data/                         ← JSON pre-calculados servidos estáticamente
│       ├── kpis_resumen.json
│       ├── ventas_mensuales.json
│       ├── top_productos.json
│       ├── ventas_cruzadas.json
│       ├── churn_clientes.json
│       ├── reposicion_activa.json
│       ├── segmentacion_rfm.json
│       └── productos_gancho.json
├── src/
│   ├── app/
│   │   ├── layout.tsx                ← Shell: Sidebar + TopBar
│   │   ├── page.tsx                  ← Módulo 1.1: Resumen Ejecutivo
│   │   ├── cruzada/page.tsx          ← Módulo 1.2: Venta Cruzada
│   │   ├── churn/page.tsx            ← Módulo 1.3: Riesgo de Abandono
│   │   ├── reposicion/page.tsx       ← Módulo 1.4: Retención Activa
│   │   ├── vip/page.tsx              ← Módulo 2.1: Clientes VIP/RFM
│   │   └── gancho/page.tsx           ← Módulo 2.2: Productos Gancho
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── TopBar.tsx
│   │   ├── charts/
│   │   │   ├── VentasMensualesChart.tsx
│   │   │   ├── TopProductosChart.tsx
│   │   │   └── ScatterRFM.tsx
│   │   ├── tables/
│   │   │   ├── ChurnTable.tsx
│   │   │   ├── ReposicionTable.tsx
│   │   │   ├── VentaCruzadaTable.tsx
│   │   │   └── VIPTable.tsx
│   │   └── ui/
│   │       ├── KPICard.tsx
│   │       ├── RiskBadge.tsx
│   │       └── FilterBar.tsx
│   └── lib/
│       ├── types.ts                  ← Interfaces TypeScript para todos los JSON
│       └── formatters.ts             ← COP, fechas DD/MM/YYYY, porcentajes
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

```typescript
// kpis_resumen.json
interface KPIsResumen {
  total_transacciones: number
  clientes_unicos: number
  ingresos_totales: number
  ticket_promedio: number
  clientes_en_riesgo_alto: number
  oportunidades_cruzada: number
  periodo: { desde: string; hasta: string }
}

// churn_clientes.json
interface ClienteChurn {
  cedula: string
  nombre: string
  telefono: string | null
  ultima_compra: string        // DD/MM/YYYY
  frecuencia_promedio_dias: number
  dias_sin_comprar: number
  churn_score: number
  nivel_riesgo: 'Alto' | 'Medio' | 'Bajo'
  accion_sugerida: string
}

// reposicion_activa.json
interface ReposicionPendiente {
  cedula: string
  nombre: string
  telefono: string | null
  producto: string
  ultima_compra: string        // DD/MM/YYYY
  ciclo_dias: number
  proxima_reposicion: string   // DD/MM/YYYY
  dias_para_reposicion: number
  estado: 'Vencido' | 'Esta semana' | 'Próximo mes'
}

// ventas_cruzadas.json
interface VentaCruzada {
  producto_base: string
  producto_recomendado: string
  veces_juntos: number
  lift: number
  confianza: number            // 0–1
  incremento_ticket_estimado: number
}

// segmentacion_rfm.json
interface ClienteRFM {
  cedula: string
  nombre: string
  recency_dias: number
  frequency: number
  monetary: number
  score_r: number              // 1–5
  score_f: number              // 1–5
  score_m: number              // 1–5
  segmento: 'VIP' | 'Leal' | 'En desarrollo' | 'En riesgo'
  clv_estimado_anual: number
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

### 8.5 Convenciones de Diseño UI

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

| ID | Requisito | Criterio |
|---|---|---|
| NFR-001 | Rendimiento | Dashboard carga en < 3 segundos (datos pre-calculados) |
| NFR-002 | Disponibilidad | 99.5% uptime en hosting de producción |
| NFR-003 | Reproducibilidad | El ETL produce el mismo output con los mismos datos de entrada |
| NFR-004 | Usabilidad | Un usuario no técnico puede operar el dashboard sin capacitación |
| NFR-005 | Exportación | Tablas de Churn y Reposición exportables a CSV con un clic |
| NFR-006 | Seguridad básica | Acceso protegido por autenticación en producción (Fase 1.5) |
| NFR-007 | Escalabilidad datos | El ETL debe soportar hasta 500.000 registros sin cambios de arquitectura |

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

### Fase 1 — MVP Piloto Super Ofertas (60 días)

| Semana | Entregable |
|---|---|
| 1–2 | ETL Python funcional + validación de datos |
| 3–4 | Layout Next.js + Módulo 1.1 (Resumen Ejecutivo) con datos reales |
| 5 | Módulo 1.2 (Venta Cruzada) |
| 6 | Módulo 1.3 (Riesgo de Abandono) |
| 7 | Módulo 1.4 (Retención Activa / Reposición) |
| 8 | QA, ajustes con el cliente, despliegue en producción |

### Fase 2 — Inteligencia Avanzada (30 días adicionales)

| Semana | Entregable |
|---|---|
| 9–10 | Módulo 2.1 (Segmentación VIP / RFM) |
| 11 | Módulo 2.2 (Productos Gancho) |
| 12 | Pulido visual, documentación, entrega final |

### Fase 3 — Producto SaaS Multi-tenant (post-piloto)

- Autenticación multi-tenant con aislamiento de datos por cliente
- Upload de archivos Excel desde la propia plataforma (sin ETL manual)
- Actualización periódica de datos (cron job semanal o mensual)
- Integración directa con sistemas POS colombianos (Siesa, Helisa, World Office)
- Módulo de campañas: generación de listas de contacto segmentadas para WhatsApp
- API REST para consumo desde otros sistemas
- Panel de administración para Next AI Tech (vista de todos los clientes)
- Pricing SaaS: plan por establecimiento o por número de transacciones analizadas

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
- Autenticación de múltiples usuarios con roles diferenciados
- Dark mode

---

*Documento preparado por Next AI Tech LLC · Miami, Florida*
*Cliente piloto: Droguería Super Ofertas · Barranquilla, Colombia*
*Sellix AI v1.0 · Abril 2026*
