# Mapa de Historias por Unidad — Sellix AI

## Unit 1 — Project Foundation & Authentication

| Historia | Descripción |
|---|---|
| US-E7-01 | Iniciar sesión con credenciales de la droguería |
| US-E7-02 | Cerrar sesión de forma segura |
| US-E7-03 | Mantener sesión activa o ser redirigido al login |

**Componentes entregados**: AppShell, Sidebar, TopBar, LoginPage, middleware.ts, todos los componentes UI base, types.ts, formatters.ts, dataService.ts, authConfig.ts, rateLimiter.ts, logger.ts, next.config.ts

---

## Unit 2 — ETL Pipeline

| Historia | Descripción |
|---|---|
| US-E8-01 | Ejecutar el ETL y generar los 8 archivos JSON |
| US-E8-02 | Verificar calidad de datos antes de procesar |
| US-E8-03 | Obtener confirmación explícita del éxito del proceso |

**Componentes entregados**: scripts/etl.py completo con todos los calculadores

---

## Unit 3 — Módulos Fase 1

| Historia | Módulo | Descripción |
|---|---|---|
| US-E1-01 | 1.1 | Ver KPIs clave del negocio |
| US-E1-02 | 1.1 | Analizar tendencia de ventas por mes |
| US-E1-03 | 1.1 | Identificar los 10 productos más rentables |
| US-E1-04 | 1.1 | Filtrar dashboard por período y canal |
| US-E2-01 | 1.2 | Ver tabla de asociaciones de productos |
| US-E2-02 | 1.2 | Buscar recomendaciones por producto (Cajero) |
| US-E2-03 | 1.2 | Leer recomendación accionable en lenguaje simple |
| US-E2-04 | 1.2 | Filtrar recomendaciones por categoría terapéutica |
| US-E3-01 | 1.3 | Ver lista priorizada de clientes en riesgo de abandono |
| US-E3-02 | 1.3 | Filtrar por nivel de riesgo |
| US-E3-03 | 1.3 | Exportar lista de seguimiento a CSV |
| US-E3-04 | 1.3 | Ver contador de clientes en riesgo alto en el encabezado |
| US-E4-01 | 1.4 | Ver próximas reposiciones de medicamentos crónicos |
| US-E4-02 | 1.4 | Filtrar por estado de reposición y buscar cliente/producto |
| US-E4-03 | 1.4 | Exportar lista de contacto de reposición a CSV |

**Componentes entregados**: DashboardPage, VentaCruzadaPage, ChurnPage, ReposicionPage + todos sus componentes de gráficas y tablas

---

## Unit 4 — Módulos Fase 2

| Historia | Módulo | Descripción |
|---|---|---|
| US-E5-01 | 2.1 | Visualizar segmentación de clientes en scatter plot RFM |
| US-E5-02 | 2.1 | Ver tabla de clientes con segmento y CLV estimado |
| US-E5-03 | 2.1 | Ver perfil detallado de un cliente |
| US-E5-04 | 2.1 | Filtrar clientes por segmento |
| US-E6-01 | 2.2 | Ver tabla de productos por categoría estratégica |
| US-E6-02 | 2.2 | Visualizar mapa de burbujas de productos |
| US-E6-03 | 2.2 | Filtrar productos por categoría de gancho |

**Componentes entregados**: VIPPage, GanchoPage, ScatterRFM, BubbleGancho, VIPTable, GanchoTable, ClienteDetailPanel

---

## Resumen de Cobertura

| Unidad | Historias | % del total |
|---|---|---|
| Unit 1 — Foundation & Auth | 3 | 11% |
| Unit 2 — ETL Pipeline | 3 | 11% |
| Unit 3 — Módulos Fase 1 | 15 | 56% |
| Unit 4 — Módulos Fase 2 | 7 | 26% |
| **Total** | **27** | **100%** ✓ |
