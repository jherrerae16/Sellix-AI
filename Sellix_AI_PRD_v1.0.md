# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## Sellix AI
### Plataforma SaaS de Inteligencia Comercial y Comercio Conversacional por WhatsApp

**Versión:** 3.0
**Fecha:** Abril 2026
**Autor:** Juan David Herrera
**Empresa:** Next AI Tech LLC
**Estado:** Producto en producción — https://sellix-ai.com
**Tipo de producto:** SaaS · CRM Conversacional · Revenue Intelligence · IA Comercial
**Repositorio:** github.com/jherrerae16/SellixAI-MVP
**Última actualización:** 21/04/2026 — Estado de producción tras code review v3

---

## 1. RESUMEN EJECUTIVO

Sellix AI es una plataforma SaaS que convierte conversaciones de WhatsApp en ventas medibles para droguerías y comercios en Latinoamérica. La plataforma combina:

- **CRM conversacional con embudo automático** que clasifica cada chat en tiempo real
- **Vendedor IA 24/7** que responde, recomienda, cotiza y cierra ventas sin intervención humana
- **Inteligencia comercial** sobre datos históricos de ventas (churn, recurrencia, productos gancho, venta cruzada)
- **Motor de promociones dirigidas** que identifica clientes con mayor probabilidad de comprar un producto en oferta
- **Análisis de recetas médicas** con IA visual que extrae medicamentos de fotos

A diferencia de los CRM tradicionales que dependen de captura manual, Sellix AI extrae inteligencia directamente de las conversaciones y de los datos POS para automatizar ventas, mover leads por el embudo y generar recomendaciones predictivas.

**Cliente piloto:** Droguería Super Ofertas — Barranquilla, Colombia
**Modelo de escala:** SaaS multi-tenant para comercios independientes en LATAM
**Idiomas:** Español colombiano (100%) — extensible a otros mercados LATAM

---

## 2. PROPUESTA DE VALOR

### 2.1 Para el dueño del negocio
- Vender más sin contratar más personal
- Tener un vendedor que nunca duerme y nunca pierde una oportunidad
- Saber qué clientes están en riesgo y actuar antes de perderlos
- Aprovechar productos en stock para campañas dirigidas en minutos

### 2.2 Para el cajero / agente
- Sugerencias de venta cruzada en tiempo real
- Información del cliente al alcance
- Vista simplificada para punto de venta

### 2.3 Para Next AI Tech (proveedor)
- Modelo SaaS multi-tenant
- Cálculo automático de comisiones por atribución de campañas
- Dashboard de ingresos generados por la plataforma

---

## 3. ARQUITECTURA DEL PRODUCTO

### 3.1 Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | Next.js 14 App Router + React 18 + TypeScript | 14.2.20 |
| Estilos | Tailwind CSS + Plus Jakarta Sans | 3.4.17 |
| Charts | Recharts | 2.15.0 |
| Tables | TanStack Table v8 | 8.20.5 |
| Auth | NextAuth.js v5 (JWT, Edge Runtime) | 5.0.0-beta.25 |
| WhatsApp | Twilio (Sandbox API en MVP) | 5.13.1 |
| Email | Resend | 6.10.0 |
| IA conversacional | Google Gemini 2.5 Flash | @google/generative-ai 0.24.1 |
| IA visual | Google Gemini 2.5 Flash Vision | (mismo) |
| Persistencia CRM | Redis (Upstash via ioredis) | 5.10.1 |
| ETL | Python 3 + pandas + openpyxl | — |
| Excel parsing | xlsx (SheetJS) | 0.18.5 |
| Deploy | Vercel (serverless) | — |

### 3.2 Patrón de almacenamiento

| Tipo de dato | Almacenamiento | Razón |
|---|---|---|
| Datos históricos (clientes, productos, ventas) | JSON estáticos en `data/output/` | Generados por scripts ETL, lectura rápida server-side |
| Conversaciones WhatsApp | Redis (Upstash) | Necesita persistencia entre serverless invocations |
| Configuración del bot (modo auto/copilot/manual) | Redis | Estado compartido en tiempo real |
| Sesiones de auth | JWT cookies | Serverless friendly |
| Promociones (futuro) | Redis | Persistencia entre sesiones |

### 3.3 Roles del sistema

| Rol | Acceso | Vista |
|---|---|---|
| `admin` | Dashboard completo, campañas, inbox, todas las pestañas | `Sidebar` con 9 items |
| `cajero` | Búsqueda de clientes, venta cruzada, reposiciones | `CajeroHome.tsx` simplificado |
| `nextaitech` | Panel de comisiones y atribución | Solo `/comisiones` |

### 3.4 Seguridad

- **Auth middleware activo** en producción (Edge Runtime)
- JWT cookies HttpOnly + SameSite=lax, expiración 8h
- HTTPS obligatorio (Vercel)
- Sin datos de cliente en `public/` — todo en `data/output/` privado
- Excel y JSONs con PII excluidos del repo Git
- Rate limiting en login (5 intentos → bloqueo 15 min)
- Auth bypass solo en: `/welcome`, `/auth/*`, `/api/auth`, `/api/whatsapp/webhook` (necesario para Twilio)

---

## 4. MÓDULOS FUNCIONALES

### 4.1 Resumen Ejecutivo (`/`)
Dashboard de bienvenida del admin con:
- 6 tarjetas KPI (transacciones, clientes únicos, ingresos, ticket promedio, churn alto, oportunidades cruzada)
- Gráfica de ventas mensuales (barras)
- Top 10 productos por ingresos (barras horizontales)
- Histograma de frecuencia de compra

### 4.2 Next Best Action (`/acciones`)
**Motor de recomendaciones priorizadas con cifras realistas.**

Acciones generadas automáticamente analizando todos los datos:
1. **Recuperar abandono crónico** (crítica) — clientes que dejaron tratamiento crónico
2. **Reactivar churn total** (alta) — clientes inactivos hace +6 meses
3. **Proteger VIPs en riesgo** (crítica) — alto valor con baja actividad
4. **Reposiciones vencidas** (crítica) — productos que ya debieron reponerse
5. **Recordatorios preventivos** (alta) — vencen esta semana
6. **Investigar downgrade** (media) — bajaron ticket >30%
7. **Fidelizar crónicos** (media) — programa de lealtad para recurrentes

**Cifras realistas:** cada acción muestra:
- Total clientes vs **clientes contactables** (con teléfono válido)
- **Ingreso realista** (basado en contactables × tasa de conversión documentada)
- Ingreso teórico (asumiendo contacto al 100%, valor de referencia superior)

**Tasas de conversión aplicadas** (basadas en benchmarks del sector farmacéutico):
| Acción | Tasa |
|---|---|
| Churn crónico recuperado | 35% |
| Churn total reactivado | 15% |
| VIP inactivo recuperado | 25% |
| Reposición vencida convertida | 55% |
| Reposición preventiva convertida | 70% |
| Downgrade lift back | 40% |
| Adopción programa de lealtad | 20% × 3 ciclos |

**Botón "Generar oferta"** (gradient indigo→violet) — abre wizard de 4 pasos para crear promociones dirigidas (sección 4.10).

### 4.3 Cotizador (`/cotizador`)
**Comparador de precios** con búsqueda en vivo del catálogo (2,871 productos).

- Precios reales del Excel de ventas (mediana, no promedio, para evitar outliers)
- Comparación con farmacias competidoras vía Gemini Search Grounding (Cruz Verde, Farmatodo, La Rebaja, Olímpica)
- Etiqueta "precio real" en valores obtenidos de Google
- Botón "Enviar por WhatsApp/Email" con cotización formateada
- Cache de 1 hora para evitar consumo de API en búsquedas repetidas

### 4.4 Inbox WhatsApp (`/inbox`)
**CRM conversacional con embudo visual.**

#### 4.4.1 Pestaña "Chats"
- Lista de conversaciones con búsqueda y filtros (sin responder, activos, pago pendiente, postventa, cerrados)
- Badges: mensajes no leídos, tags, estado del pedido
- Avatar con código de color según estado
- Panel central: historial de mensajes estilo WhatsApp + compositor
- Panel derecho: ficha del cliente, etiquetas, notas, pedido, acciones

#### 4.4.2 Pestaña "Embudo" (Kanban)
5 columnas con movimiento automático por IA:
1. **Lead inicial** — primer contacto
2. **Seguimiento** — admin ya respondió
3. **Cliente potencial** — menciona precios/productos con intención de compra
4. **Venta** — link de pago generado
5. **Postventa** — pedido entregado + followup automático

#### 4.4.3 Modos de operación del bot
Toggle en el header:
- **Automático** (default) — IA responde sola al cliente
- **Co-piloto** — IA genera borrador, admin aprueba
- **Manual** — Solo registra, admin responde todo

#### 4.4.4 Acciones desde el chat
| Acción | Resultado |
|---|---|
| Crear pedido | Asocia productos al chat |
| Generar link de pago | URL demo + mensaje al cliente |
| Confirmar pago | Marca pagado, registra método (Nequi, etc.) |
| Marcar entregado | Cambia estado + envía followup automático |
| Cambiar etapa | Override manual del embudo |
| Tags / Notas | Etiquetas y notas internas |

### 4.5 Venta Cruzada (`/cruzada`)
**Asociaciones multinivel** desde 9,878 sesiones de venta:

- **Tab Productos** — 437 pares con Lift ≥1.5, Confianza, Veces juntos
- **Tab Combos** (NUEVO) — 8 bundles de 3-5 productos con ticket promedio y categorías
- **Tab Categorías** — 597 asociaciones de categorías terapéuticas

Sortable por: Lift / Veces / Confianza. Búsqueda en vivo.

### 4.6 Churn (`/churn`)
**Riesgo de abandono multinivel.**

7 tipos de cliente:
- `activo` — comprando regularmente
- `churn_riesgo` — empezando a alejarse
- `churn_tratamiento` — abandonó ≥2 tratamientos
- `churn_cronico` — dejó tratamiento crónico (alto riesgo)
- `churn_total` — no compra hace +6 meses
- `downgrade` — sigue comprando pero bajó ticket >30%
- `alto_valor_inactivo` — VIP perdiendo actividad

**Top tratamientos abandonados** — lista de qué medicamentos pierden clientes.

Tabla con filtros (tipo, riesgo, contactables) + sorting + click → drawer detalle con tratamientos abandonados, históricos, y acciones recomendadas.

### 4.7 Reposición (`/reposicion`)
**Predicción de cuándo cada cliente necesita reponer.**

Filtros aplicados (productos crónicos):
- Mínimo 3 compras del mismo producto por el mismo cliente
- Coeficiente de variación del ciclo ≤ 0.6 (estabilidad)
- Ciclo promedio ≤ 120 días

3 tabs por estado: Vencido / Esta semana / Próximo mes.
Filtro **Contactables** + búsqueda + sorting + drawer de detalle con timeline de compras.

### 4.8 Clientes (`/vip`)
**Segmentación por recurrencia de compra.**

6 tipos basados en patrones, categoría terapéutica y tratamiento:
| Tipo | Definición |
|---|---|
| `recurrente_producto` | Mismo SKU repetido ≥3 veces |
| `recurrente_categoria` | Rota marcas pero misma categoría terapéutica |
| `recurrente_tratamiento` | Tratamiento crónico continuo |
| `frecuente_multicomprador` | Alta frecuencia, productos variados |
| `ocasional` | Compras esporádicas |
| `inactivo` | No compra hace >90 días |

Tabla con sorting + filtro Contactables + click → drawer con KPIs, timeline, top productos/categorías/tratamientos.

### 4.9 Productos Gancho (`/gancho`)
Identificación de productos que generan tráfico:
- Bubble chart (atracción × arrastre, tamaño = ticket promedio)
- Tabla con 4 categorías: Gancho Primario, Secundario, Volumen Puro, Nicho Estratégico

### 4.10 Generador de Ofertas (modal en `/acciones`)
**Wizard de 4 pasos para promociones dirigidas.**

#### Paso 1: Producto
Búsqueda en vivo del catálogo con `AbortController` para prevenir resultados obsoletos.

#### Paso 2: Configuración
- Cantidad disponible (lo que llegó al inventario)
- Precio promo (default 15% descuento)
- Vigencia en días
- Cálculo automático de descuento %, ahorro al cliente

#### Paso 3: Identificación de clientes objetivo
**Sistema de scoring 0-100** basado en:
| Señal | Puntos |
|---|---|
| Compró el producto exacto antes (codigo o nombre fuzzy) | +50 base + 5 por repetición (cap 25) |
| Tiene reposición pendiente del mismo producto | +30 |
| Compra productos de la misma categoría terapéutica | +20 base + 2 por compra (cap 15) |
| Compra productos del mismo tratamiento | +5 + 1 por compra (cap 10) |
| Es cliente recurrente o multicomprador | +15 |
| Está inactivo | -10 |

**Matching robusto:** código exacto primero, fallback a fuzzy match solo en tokens ≥5 caracteres (evita match con números o letras sueltas).

Auto-selecciona contactables, greys out no contactables, muestra ingreso potencial en tiempo real.

#### Paso 4: Mensaje
Template pre-llenado con descuento, precio antes/ahora, vigencia. **Editable.** Variable `{{nombre}}` se reemplaza con `safeName()` (sanitizado).

**Confirmación obligatoria** si recipients > 20 (previene envíos masivos accidentales).

### 4.11 Cargar datos (`/upload`)
- Drag & drop de Excel
- Detección automática del archivo de ventas más grande
- Toggle activo/inactivo por archivo
- Nota: en Vercel filesystem es read-only, persistencia limitada a sesión

### 4.12 Comisiones (`/comisiones`) — Solo rol `nextaitech`
- Logs de mensajes enviados por la plataforma
- Atribución: cruza mensajes con compras dentro de ventana (default 7 días)
- Cálculo de comisión por % de ventas atribuidas
- Tabla de detalle con filtros

### 4.13 Análisis de Recetas (entra por WhatsApp webhook)
Flujo:
1. Cliente envía foto de receta → Twilio webhook detecta `image/*`
2. Sistema descarga imagen con auth Twilio
3. **Gemini 2.5 Flash Vision** analiza la imagen
4. Extrae nombre, dosis, presentación, cantidad de cada medicamento
5. Match contra catálogo (exact / similar / not found)
6. Calcula total estimado
7. Responde por WhatsApp con lista formateada
8. Tag `receta` y stage → `potencial`

### 4.14 Copiloto IA (botón flotante, admin)
Chat interno donde el admin pregunta en lenguaje natural:
- "¿Cuántos clientes están en churn alto?"
- "¿Qué reposiciones vencen esta semana?"
- "Resúmeme la actividad del último mes"

Implementado con Gemini function calling sobre los datos del dashboard.

### 4.15 Vendedor IA (auto-respuesta WhatsApp)
**Responde automáticamente** a clientes en modo "auto":

Capacidades:
- Saluda y se presenta como Droguería Super Ofertas
- Busca productos en catálogo con precios reales
- Explica presentaciones disponibles (caja x30, x100, blister, etc.)
- Sugiere venta cruzada al confirmar producto
- Muestra comparación de precios vs competencia (Gemini Search) si el cliente duda
- Maneja objeciones de precio
- Genera pedido y link de pago demo
- Responde fuera de horario con info de horarios

**Reglas estrictas del system prompt:**
- Nunca inventar precios
- Nunca inventar productos que no estén en catálogo
- "No" después de cross-sell NO cancela el pedido
- Manejo de errores con retry (2 intentos antes de dejar mensaje pendiente)
- Tono colombiano profesional, cálido

---

## 5. CALIDAD DE CÓDIGO Y PRODUCCIÓN

### 5.1 Estado tras code review v3 (Abril 2026)

10 issues críticos + 1 de seguridad **resueltos** para llevar el producto de MVP a producción:

| # | Fix |
|---|---|
| 1 | Variables sin uso eliminadas |
| 2 | Matching de productos robusto (código exacto, fuzzy ≥5 chars) |
| 3 | Campo `codigo` agregado a reposiciones |
| 4 | Validación de body en endpoint `/api/promotions/match` (400 limpio) |
| 5 | `AbortController` en search del modal (previene race conditions) |
| 6 | Helper `getBasePrice()` deduplica 8+ usos de cálculo de precio |
| 7 | Constantes documentadas: `SCORE.*` (10 valores), `CONVERSION.*` (8 tasas con rationale) |
| 8 | Cálculo de fidelización corregido (incremental, no total) |
| 9 | `safeName()` sanitiza nombres en mensajes WhatsApp |
| 10 | Tipos compartidos en `src/lib/types.ts`, no duplicados |
| Sec | Confirmación obligatoria en envíos > 20 destinatarios |

### 5.2 Métricas técnicas

| Métrica | Valor |
|---|---|
| Páginas | 12 |
| API routes | 13 |
| Componentes React | 39 |
| Librerías compartidas | 15 |
| Líneas de TS/TSX | ~10,000 |
| Build time | ~30s en Vercel |
| Bundle JS shared | 87.4 KB |
| Edge Middleware | 77 KB |

### 5.3 Datos procesados

| Dataset | Registros | Generador |
|---|---|---|
| Productos clasificados terapéuticamente | 2,870 | Gemini 2.5 Flash (96 batches × 30) |
| Catálogo de precios reales | 2,871 | ETL TypeScript |
| Recurrencia de clientes (6 tipos) | 957 | `analyze-recurrence.mjs` |
| Asociaciones de productos (Lift ≥1.5) | 437 | `analyze-cross-sell.mjs` |
| Asociaciones de categorías | 597 | `analyze-cross-sell.mjs` |
| Combos de 3-5 productos | 8 | `analyze-bundles.mjs` |
| Clientes con clasificación de churn v2 | 957 | `analyze-churn.mjs` |
| Top tratamientos abandonados | 8 | `analyze-churn.mjs` |
| Reposiciones predichas (con código) | 280 | `etl.ts` |
| Productos gancho clasificados | 3,268 | ETL Python |
| Total transacciones procesadas | 17,721 | Excel raw |
| Total ingresos analizados | $489M COP | — |

---

## 6. INTEGRACIONES EXTERNAS

| Servicio | Uso | Estado |
|---|---|---|
| Twilio WhatsApp Sandbox | Recepción y envío de mensajes | Activo (sandbox para demo) |
| Resend | Email transaccional | Activo (free tier 100/día) |
| Google Gemini 2.5 Flash | LLM conversacional + Vision | Activo |
| Google Search Grounding | Comparación de precios competencia | Activo via Gemini |
| Upstash Redis | Persistencia CRM serverless | Activo |
| Vercel KV | Storage Redis | Conectado |
| GitHub | Repo + auto-deploy | Activo |

---

## 7. SECRETOS Y CONFIGURACIÓN

Variables de entorno requeridas en producción:

```env
# NextAuth
NEXTAUTH_SECRET=<openssl rand -base64 32>
APP_USER=admin
APP_PASSWORD=<contraseña fuerte>

# Gemini
GEMINI_API_KEY=AIza...

# Twilio (WhatsApp)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Email
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Sellix AI <onboarding@resend.dev>

# Redis (auto inyectado por Vercel KV)
REDIS_URL=redis://...

# Demo (todas las pruebas van a estos destinos)
DEMO_EMAIL=tu@email.com
DEMO_PHONE=whatsapp:+57...

# Comisiones
COMMISSION_RATE=0.05
```

---

## 8. ROADMAP

### Fase 1 — MVP Piloto ✅ COMPLETADA
- Dashboard analytics, 6 módulos base, ETL Python, autenticación

### Fase 2 — Inteligencia Avanzada ✅ COMPLETADA
- VIP/RFM, Productos Gancho, Upload de Excel

### Fase 3 — CRM WhatsApp + IA ✅ COMPLETADA
- Inbox CRM con embudo automático
- Vendedor IA 24/7 (Gemini con function calling)
- Análisis de recetas con Gemini Vision
- Cotizador con Google Search Grounding
- Motor de campañas + atribución + comisiones
- Copiloto IA para admin
- Landing page público con AI-Native UI

### Fase 4 — Producto de Producción ✅ COMPLETADA (Abril 2026)
- Clasificación terapéutica de 2,870 productos con Gemini
- Recurrencia de compra (6 tipos)
- Churn multinivel (7 tipos)
- Venta cruzada multinivel (productos / combos / categorías)
- Filtro Contactables en todas las tablas
- **Generador de Ofertas** con scoring de probabilidad
- Cifras realistas en Next Best Action
- Code review completo + 11 fixes críticos
- Deploy en producción

### Fase 5 — Escalamiento (próximos pasos)
- WhatsApp Business API directo (Meta Cloud API) para evitar sandbox
- Pasarela de pago real (Wompi, Nequi, Mercado Pago)
- Multi-tenancy con aislamiento de datos por droguería
- Persistencia de promociones en Redis (actualmente en sesión)
- Integración con POS colombianos (Siesa, Helisa, World Office)
- Tests unitarios para scoring algorithms y conversion rates
- App móvil nativa para cajeros
- Dashboard PWA installable

---

## 9. CRITERIOS DE ÉXITO DEL PILOTO

### 9.1 Cumplidos ✅
1. ✅ Dashboard carga en < 3 segundos con 957 clientes
2. ✅ Churn identifica correctamente clientes ausentes vs activos (415 alto + 415 medio + 526 bajo)
3. ✅ Venta Cruzada genera 437 pares con Lift ≥1.5
4. ✅ Reposición predice próxima compra para 280 clientes (filtros de calidad aplicados)
5. ✅ Manager puede navegar todos los módulos sin asistencia técnica
6. ✅ Auth en producción con login + redirect a landing público

### 9.2 KPIs en producción
- Tiempo de respuesta del Vendedor IA: < 5 segundos
- Tasa de matching de productos en cotizador: 99%
- Build size: 87.4 KB shared JS (cumple < 100 KB)
- Edge middleware: 77 KB (cumple < 100 KB)
- Cobertura de productos clasificados: 99.9% (2,870 de 2,871)

---

## 10. INVENTARIO DE ARCHIVOS

### 10.1 Páginas (12)
`/`, `/acciones`, `/churn`, `/comisiones`, `/cotizador`, `/cruzada`, `/gancho`, `/inbox`, `/reposicion`, `/upload`, `/vip`, `/welcome` (público) + `/auth/signin`

### 10.2 API Routes (13)
- `actions` — Next Best Action engine
- `auth/[...nextauth]` — NextAuth
- `bot` — config del modo del bot
- `campaigns/attribution` — atribución de campañas
- `campaigns/send` — envío masivo
- `copilot` — chat IA del admin
- `crm` — operaciones del inbox
- `products/generate` — regenera catálogo desde Excel
- `products/search` — búsqueda + comparación de precios
- `promotions/match` — match de clientes para promo
- `upload` — manejo de archivos
- `whatsapp/send` — envío individual
- `whatsapp/webhook` — recepción Twilio

### 10.3 Librerías compartidas (15)
`RoleContext`, `authConfig`, `botConfig`, `campaignTemplates`, `crmData`, `crmStore`, `dataService`, `etl`, `formatters`, `funnelEngine`, `logger`, `prescriptionAnalyzer`, `rateLimiter`, `salesAgent`, `types`

### 10.4 Componentes (39)
- **Auth/Layout (8):** AppShell, AppShellWrapper, AdminOnly, HomeRouter, Sidebar, TopBar, SignInForm, LandingPage
- **UI core (10):** PageHeader, StatCard, KPICard, RiskBadge, FilterBar, SearchInput, ExportButton, AccionCajaPanel, ClienteDetailPanel, CampaignModal
- **Modales (2):** PromotionModal, CopilotChat
- **Charts (5):** VentasMensualesChart, TopProductosChart, FrecuenciaHistogram, ScatterRFM, BubbleGancho
- **Tablas (8):** ChurnTable, ChurnV2Table, ReposicionTable, RecurrenciaTable, VIPTable, VentaCruzadaTable, GanchoTable, CrossSellV2Tabs
- **Feature-specific (6):** CajeroHome, ChurnCampaignView, ReposicionCampaignView, ChatList, ChatDetail, Funnel

### 10.5 Scripts ETL (6)
- `etl.py` — ETL principal Python (legacy)
- `analyze-recurrence.mjs` — segmentación de clientes (6 tipos)
- `analyze-churn.mjs` — churn multinivel (7 tipos)
- `analyze-cross-sell.mjs` — asociaciones productos/categorías/tratamientos
- `analyze-bundles.mjs` — combos de 3-5 productos
- `classify-products.mjs` — clasificación terapéutica con Gemini (96 batches)

### 10.6 Datasets (15 JSONs)
| Archivo | Tamaño | Registros |
|---|---|---|
| `kpis_resumen.json` | <1KB | 1 objeto |
| `ventas_mensuales.json` | <1KB | 6 meses |
| `top_productos.json` | 1.3KB | 10 |
| `productos_clasificados.json` | ~1MB | 2,870 |
| `precios_catalogo.json` | ~500KB | 2,871 |
| `productos_gancho.json` | ~840KB | 3,268 |
| `clientes_rfm.json` | ~342KB | 957 |
| `recurrencia_clientes.json` | ~700KB | 957 |
| `churn_clientes.json` | ~268KB | 957 (legacy) |
| `churn_v2.json` | ~400KB | 957 (nuevo) |
| `churn_resumen.json` | ~5KB | summary |
| `ventas_cruzadas.json` | ~25KB | 111 (legacy) |
| `ventas_cruzadas_v2.json` | ~150KB | 437+597+565 |
| `bundles.json` | ~10KB | 8 |
| `reposicion_pendiente.json` | ~250KB | 280 |

---

## 11. CHANGELOG RESUMIDO

**v1.0 (Abril 1, 2026)** — MVP inicial: dashboard analytics, 6 módulos base
**v1.1 (Abril 2, 2026)** — Campañas WhatsApp/Email + atribución
**v1.2 (Abril 3, 2026)** — Cotizador + análisis de recetas + copiloto IA
**v1.3 (Abril 4, 2026)** — Inbox CRM con embudo automático
**v2.0 (Abril 4, 2026)** — Vendedor IA 24/7 con function calling
**v2.5 (Abril 14, 2026)** — Landing page público con AI-Native UI
**v3.0 (Abril 21, 2026)** — Producción ready
- Clasificación terapéutica con Gemini (2,870 productos)
- Segmentación multinivel (recurrencia + churn + cruzada)
- Generador de ofertas dirigidas con scoring de probabilidad
- Cifras realistas con tasas de conversión documentadas
- 11 fixes de code review aplicados
- Filtro Contactables en todas las tablas

---

*Documento preparado por Next AI Tech LLC · Miami, Florida*
*Cliente piloto: Droguería Super Ofertas · Barranquilla, Colombia*
*Sellix AI v3.0 · Abril 2026*
*Producción: https://sellix-ai.com*
