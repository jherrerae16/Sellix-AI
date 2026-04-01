# Documento de Requerimientos — Sellix AI
## Plataforma de Inteligencia de Ventas para Droguerías

**Versión**: 1.0  
**Fecha**: 2026-04-01  
**Proyecto**: Greenfield  
**Fuente base**: Sellix_AI_PRD_v1.0.md + Respuestas de verificación  

---

## 1. Análisis de Intención

| Campo | Valor |
|---|---|
| Solicitud del usuario | Dashboard SaaS de inteligencia de ventas con IA para droguerías, con churn, venta cruzada, reposición, RFM y productos gancho |
| Tipo de solicitud | New Project (Greenfield) |
| Estimación de alcance | System-wide — 6 módulos de dashboard + pipeline ETL + autenticación |
| Estimación de complejidad | Complex — algoritmos de scoring IA, pipeline de datos, multi-módulo, auth |

---

## 2. Contexto de Negocio

- **Producto**: Sellix AI — SaaS de inteligencia comercial para el canal farmacéutico
- **Cliente piloto**: Droguería Super Ofertas — Barranquilla, Colombia
- **Empresa**: Next AI Tech LLC — Miami, Florida
- **Problema central**: Las droguerías independientes tienen datos históricos sin utilizar, lo que genera pérdida silenciosa de clientes, cero venta cruzada, reposición reactiva y desconocimiento del valor real de cada cliente
- **Modelo de escala**: SaaS multi-tenant para droguerías independientes y cadenas en Latinoamérica

### North Star Metric
> Ingresos recurrentes protegidos + ticket promedio incrementado por cliente identificado

### KPIs Meta (12 meses)
| Indicador | Meta |
|---|---|
| Reducción de churn en clientes recurrentes | -30% |
| Incremento de ticket promedio | +20% |
| Aumento en frecuencia de recompra | +25% |
| Clientes VIP retenidos activamente | +40% |
| Tiempo de respuesta comercial al cliente | -60% |

---

## 3. Usuarios Objetivo

| Rol | Perfil | Necesidad principal |
|---|---|---|
| Gerente / Propietario | 10–30 años en farmacéutico, no técnico, multi-tarea | Vista global del negocio, clientes en riesgo, oportunidades |
| Personal de caja / vendedor | 50–200 clientes/día, bajo presión, sin historial | Recomendación inmediata en punto de venta |
| Consultor (Fase SaaS futura) | Externo, multi-cliente | Vista multi-tenant, comparativas |

---

## 4. Alcance Confirmado

**Fase 1 + Fase 2 completas — 6 módulos funcionales:**

| Módulo | Nombre | Fase |
|---|---|---|
| 1.1 | Resumen Ejecutivo | 1 |
| 1.2 | Detección de Oportunidades de Venta Cruzada | 1 |
| 1.3 | Riesgo de Abandono (Churn) | 1 |
| 1.4 | Retención Activa (Predicción de Reposición) | 1 |
| 2.1 | Segmentación y Protección de Clientes VIP (RFM) | 2 |
| 2.2 | Productos Gancho | 2 |

---

## 5. Requerimientos Funcionales

### RF-001 — Pipeline ETL (Python)

- **RF-001.1**: Cargar `Ventas_Superofertas.xlsx` y `Remisiones_Mayo_Octubre_Superofertas.xlsx` desde `data/raw/`
- **RF-001.2**: Ejecutar `resumen_calidad_datos()` — validación de integridad antes de procesar
- **RF-001.3**: Filtrar consumidor final (`Identificación = 222222222222`) de todos los modelos de clientes; incluir en análisis de productos
- **RF-001.4**: Fecha de referencia fija: **2025-10-31** (última fecha del dataset)
- **RF-001.5**: Generar los 8 archivos JSON en `public/data/`: `kpis_resumen.json`, `ventas_mensuales.json`, `top_productos.json`, `ventas_cruzadas.json`, `churn_clientes.json`, `reposicion_activa.json`, `segmentacion_rfm.json`, `productos_gancho.json`
- **RF-001.6**: ETL reproducible — mismo input siempre produce mismo output
- **RF-001.7**: Soportar hasta 500.000 registros sin cambios de arquitectura

### RF-011 — Módulo 1.1: Resumen Ejecutivo

- **RF-011.1**: KPI cards: total transacciones, clientes únicos, ingresos totales (COP), ticket promedio, clientes en riesgo alto, oportunidades de venta cruzada
- **RF-011.2**: Gráfica de ventas por mes (barras) — eje X mes, eje Y ingresos COP
- **RF-011.3**: Top 10 productos por ingresos (barras horizontales)
- **RF-011.4**: Histograma distribución de clientes por frecuencia de compra
- **RF-011.5**: Filtro por rango de fechas (date picker) y canal (Mostrador / Domicilio / Todos)
- **RF-011.6**: Valores monetarios en COP formato `$1.500.000`; fechas `DD/MM/YYYY`

### RF-012 — Módulo 1.2: Venta Cruzada

- **RF-012.1**: Algoritmo de asociación — soporte, confianza y lift por par de productos. Umbral relevante: Lift > 1.5
- **RF-012.2**: Tabla principal: Producto base · Producto recomendado · Veces juntos · Lift · Confianza (%) · Incremento est. ticket
- **RF-012.3**: Buscador por nombre de producto (acceso rápido para cajero)
- **RF-012.4**: Panel de acción en caja en lenguaje plano, sin jerga técnica
- **RF-012.5**: Filtro por categoría terapéutica

### RF-013 — Módulo 1.3: Riesgo de Abandono (Churn)

- **RF-013.1**: Churn score = `dias_desde_ultima_compra / frecuencia_promedio_dias` — mínimo 3 compras por cliente
- **RF-013.2**: Clasificación: Alto (≥2.0) / Medio (1.3–1.99) / Bajo (<1.3) con acciones sugeridas
- **RF-013.3**: Tabla: Cliente · Cédula · Última compra · Frecuencia habitual (días) · Días sin comprar · Score · Nivel · Acción
- **RF-013.4**: Filtro por nivel de riesgo
- **RF-013.5**: Exportación a CSV con un clic
- **RF-013.6**: Contador de clientes en riesgo alto siempre visible en el header

### RF-014 — Módulo 1.4: Retención Activa / Reposición

- **RF-014.1**: Por par (cliente, producto) con ≥2 compras: calcular `proxima_compra_estimada` y `dias_para_reposicion`
- **RF-014.2**: Estado: Vencido (negativo) / Esta semana (0–7 días) / Próximo mes (8–30 días)
- **RF-014.3**: Producto crónico = aparece en Remisiones OR comprado por mismo cliente >3 veces en período
- **RF-014.4**: Tabla: Cliente · Teléfono · Producto · Última compra · Ciclo habitual (días) · Próxima reposición · Estado
- **RF-014.5**: Filtro por estado + buscador por cliente o producto
- **RF-014.6**: Exportación a CSV con un clic

### RF-021 — Módulo 2.1: Segmentación VIP / RFM

- **RF-021.1**: Calcular R (recency), F (frequency), M (monetary) por cliente con cédula válida
- **RF-021.2**: Escalar en quintiles (1–5) y asignar segmento: VIP (R≥4,F≥4,M≥4) / Leal / En desarrollo / En riesgo
- **RF-021.3**: CLV estimado anual = `ticket_promedio × frecuencia_mensual × 12`
- **RF-021.4**: Scatter plot RFM interactivo — Eje X: Frecuencia, Eje Y: Valor, Tamaño burbuja: Recency inv., Color: Segmento
- **RF-021.5**: Tabla: Cliente · Segmento · CLV estimado · Ticket promedio · Frecuencia · Última compra · Riesgo churn
- **RF-021.6**: Panel de detalle por cliente al hacer clic — historial, productos frecuentes, tendencia de gasto
- **RF-021.7**: Filtro por segmento

### RF-022 — Módulo 2.2: Productos Gancho

- **RF-022.1**: Calcular índice de atracción, poder de arrastre y elasticidad simple por producto
- **RF-022.2**: Categorización: Gancho Primario / Gancho Secundario / Volumen puro / Nicho estratégico
- **RF-022.3**: Tabla: Producto · Categoría · Frec. aparición · Poder arrastre · ¿Descuento frecuente? · Ticket promedio en sesión
- **RF-022.4**: Mapa de burbujas — Eje X: Frecuencia, Eje Y: Poder de arrastre, Tamaño: Ticket promedio
- **RF-022.5**: Filtro por categoría de gancho

### RF-031 — Autenticación

- **RF-031.1**: Autenticación básica con NextAuth.js — credencial única para la droguería (1 usuario/contraseña)
- **RF-031.2**: Todas las rutas del dashboard protegidas — redirección a login si no autenticado
- **RF-031.3**: Sesión con expiración configurada; invalidación al cerrar sesión
- **RF-031.4**: Página de login en español, sin exposición de errores internos

---

## 6. Requerimientos No Funcionales

| ID | Requisito | Criterio |
|---|---|---|
| NFR-001 | Rendimiento | Dashboard carga en < 3 segundos (datos pre-calculados como JSON estáticos) |
| NFR-002 | Disponibilidad | 99.5% uptime en Vercel |
| NFR-003 | Reproducibilidad | ETL produce mismo output con mismos datos de entrada |
| NFR-004 | Usabilidad | Usuario no técnico opera el dashboard sin capacitación |
| NFR-005 | Exportación | Tablas de Churn y Reposición exportables a CSV con un clic |
| NFR-006 | Seguridad / Auth | NextAuth.js con sesión segura, incluido en esta implementación |
| NFR-007 | Escalabilidad datos | ETL soporta hasta 500.000 registros |

---

## 7. Reglas de Negocio Globales

1. **Cliente recurrente válido** = mínimo 2 compras con cédula identificada
2. **Consumidor final anónimo** = `Identificación = 222222222222` — excluido de CRM, incluido en análisis de productos
3. **Producto crónico** = aparece en Remisiones (domicilio) OR comprado por mismo cliente más de 3 veces en 6 meses
4. **Sesión de compra** = mismo `Consecutivo Movimiento` en Ventas / mismo número `Remision` en Remisiones
5. **Moneda** = COP, formato `$1.500.000`. No convertir.
6. **Fecha base de análisis** = 2025-10-31 (fija para reproducibilidad)
7. **Mínimo para churn** = cliente con al menos 3 compras históricas
8. **Mínimo para reposición** = par cliente-producto con al menos 2 compras del mismo SKU

---

## 8. Stack Tecnológico Confirmado

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14+ (App Router) + TypeScript |
| Estilos | Tailwind CSS |
| Gráficas | Recharts |
| Tablas | TanStack Table v8 |
| Autenticación | NextAuth.js |
| ETL / Análisis | Python 3.11+ · pandas · openpyxl |
| Datos en runtime | JSON estáticos en `public/data/` |
| Despliegue | Vercel |
| Repositorio | Local (sin remoto en esta fase) |
| Idioma UI | Español colombiano 100% |

---

## 9. Convenciones de UI

| Elemento | Valor |
|---|---|
| Color primario | `#185FA5` |
| Riesgo alto | `#E24B4A` |
| Riesgo medio | `#EF9F27` |
| OK / positivo | `#3B6D11` |
| Tipografía | Inter / Geist |
| Moneda | COP — `$1.500.000` |
| Fechas | `DD/MM/YYYY` |
| Responsive | Desktop y tablet — sin dark mode |

---

## 10. Extensión de Seguridad — Estado

**Habilitada**: Sí — todas las reglas SECURITY-01 a SECURITY-15 activas como restricciones bloqueantes.

| Regla | Aplicabilidad | Justificación |
|---|---|---|
| SECURITY-01 | N/A | No hay bases de datos ni almacenamiento persistente — solo JSON estáticos servidos por Vercel |
| SECURITY-02 | N/A | No hay load balancers ni API gateways propios — Vercel los gestiona |
| SECURITY-03 | Aplicable | Logging estructurado requerido en ETL y en Next.js |
| SECURITY-04 | Aplicable | HTTP headers de seguridad en next.config.js |
| SECURITY-05 | Aplicable | Validación de inputs en búsquedas y formulario de login |
| SECURITY-06 | N/A | No hay IAM policies — Vercel gestiona el deployment |
| SECURITY-07 | N/A | No hay configuración de red VPC propia |
| SECURITY-08 | Aplicable | Control de acceso vía NextAuth.js middleware en todas las rutas |
| SECURITY-09 | Aplicable | Sin credenciales default, errores genéricos para el usuario |
| SECURITY-10 | Aplicable | Lock files versionados, sin dependencias sin uso |
| SECURITY-11 | Aplicable | Rate limiting en el endpoint de login |
| SECURITY-12 | Aplicable | Gestión de credenciales, sesión segura, protección brute-force |
| SECURITY-13 | Aplicable | SRI en recursos externos de CDN; integridad de datos críticos |
| SECURITY-14 | Aplicable | Alertas de eventos de seguridad, retención de logs |
| SECURITY-15 | Aplicable | Manejo de excepciones seguro, global error handler |

---

## 11. Fuera de Alcance (esta implementación)

- Integración en tiempo real con POS o ERP
- Chat conversacional o WhatsApp bot
- App móvil nativa
- Multi-tenant con aislamiento por cliente
- Upload de Excel desde la UI (ETL se ejecuta localmente)
- Dark mode
- CI/CD automático (se agrega en fase posterior)
