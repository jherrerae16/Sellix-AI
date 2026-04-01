# Modelo de Lógica de Negocio — Unit 3: Módulos Fase 1

## Módulo 1.1 — Resumen Ejecutivo (`/`)

**Server Component** — fetch paralelo de 4 fuentes al cargar la página.

```
Datos: getKPIsResumen(), getVentasMensuales(), getTopProductos(), getClientesChurn()

KPI Cards (6): total_transacciones, clientes_unicos, ingresos_totales,
               ticket_promedio, clientes_en_riesgo_alto, oportunidades_cruzada

VentasMensualesChart: BarChart Recharts — eje X: mes formateado (MMM YY),
                      eje Y: ingresos en COP

TopProductosChart: BarChart horizontal — top 10 productos por ingresos

FrecuenciaHistogram: bins de frecuencia_promedio_dias de clientes churn
                     (0-15, 15-30, 30-45, 45-60, 60-90, >90 días)
```

---

## Módulo 1.2 — Venta Cruzada (`/cruzada`)

**Flujo principal (US-E2-02) — Búsqueda por cajero:**

```
Estado inicial: SearchInput vacío, tabla completa visible, AccionCajaPanel oculto

Al escribir en SearchInput (debounce 300ms):
  1. filtrar ventas_cruzadas donde producto_base.includes(query) (case-insensitive)
  2. Si hay resultados: mostrar AccionCajaPanel con top 1 recomendación
  3. Tabla debajo muestra todas las recomendaciones del producto buscado

AccionCajaPanel:
  - Texto simple: "Cuando alguien compra X, ofrézca también Y (+$Z)"
  - Visible solo cuando hay búsqueda activa con resultados

VentaCruzadaTable:
  - Columnas: producto_base, producto_recomendado, veces_juntos, lift, confianza%, incremento_ticket
  - Ordenable por lift DESC por defecto
  - Filtro por categoria_terapeutica (dropdown)
```

---

## Módulo 1.3 — Riesgo de Abandono (`/churn`)

**Flujo principal:**

```
ChurnTable (TanStack Table v8):
  - Columnas: nombre, cedula, ultima_compra, frecuencia_promedio_dias,
              dias_sin_comprar, churn_score, nivel_riesgo (RiskBadge), accion_sugerida
  - Filtro por nivel_riesgo (dropdown: Alto/Medio/Bajo/Todos)
  - Ordenable por churn_score DESC (default)
  - Paginación: 20 por página
  - Click en fila → ClienteDetailPanel (drawer lateral)

KPI chips: total Alto, total Medio, total Bajo (conteos en header de la tabla)

ExportButton: exporta datos filtrados a CSV
```

---

## Módulo 1.4 — Retención Activa / Reposición (`/reposicion`)

**Flujo principal:**

```
ReposicionTable (TanStack Table v8):
  - Columnas: nombre, telefono, producto, ultima_compra, ciclo_dias,
              proxima_reposicion, dias_para_reposicion, estado (badge de color)
  - Filtro por estado (tabs: Todos / Vencido / Esta semana / Próximo mes)
  - SearchInput: busca por nombre de cliente o producto
  - Ordenar por dias_para_reposicion ASC (más urgentes primero, default)
  - Paginación: 20 por página

EstadoBadge: Vencido=rojo, Esta semana=naranja, Próximo mes=verde

ExportButton: exporta datos filtrados a CSV
```

---

## Reglas de Frontend Compartidas

- **Datos pre-cargados**: todas las páginas son Server Components que pasan datos
  como props a Client Components. No hay fetch del lado del cliente.
- **Filtros client-side**: TanStack Table filtra/ordena en memoria. Sin llamadas HTTP.
- **Paginación**: 20 filas por página en todas las tablas.
- **Formato**: COP y fechas DD/MM/YYYY en toda la UI (usando formatters.ts).
- **Skeleton loading**: N/A — datos disponibles en SSG antes de render.
