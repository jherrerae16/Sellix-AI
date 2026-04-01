# Modelo de Lógica de Negocio — Unit 4: Módulos Fase 2

## Módulo 2.1 — Segmentación VIP / RFM (`/vip`)

**Server Component** — fetch de getClientesRFM() + getClientesChurn()

```
ScatterRFM (Recharts ScatterChart):
  Eje X: frequency (número de sesiones)
  Eje Y: monetary (valor total COP)
  Color de punto: segmento → VIP=#185FA5, Leal=#3B6D11, En desarrollo=#EF9F27, En riesgo=#E24B4A
  Tooltip: nombre, segmento, CLV estimado, ticket promedio, última compra
  Click en punto → ClienteDetailPanel (drawer)

VIPTable (TanStack Table v8):
  Columnas: nombre/cédula, segmento (badge), CLV estimado, ticket promedio,
            frequency, última compra, churn_score (colored number)
  Filtro: segmento (VIP / Leal / En desarrollo / En riesgo / Todos)
  Orden default: clv_estimado_anual DESC
  Click fila → ClienteDetailPanel (drawer)
  Paginación: 20 por página
```

---

## Módulo 2.2 — Productos Gancho (`/gancho`)

**Server Component** — fetch de getProductosGancho()

```
BubbleGancho (Recharts ScatterChart con dimensión Z):
  Eje X: indice_atraccion (frecuencia relativa de aparición)
  Eje Y: poder_arrastre (productos adicionales promedio por sesión)
  Tamaño burbuja: ticket_promedio_en_sesion (normalizado 4–20px radio)
  Color: categoria_gancho →
    Gancho Primario = #185FA5, Gancho Secundario = #3B6D11,
    Volumen puro = #EF9F27, Nicho estratégico = #9333ea
  Tooltip: nombre, categoría, tiene_descuento_frecuente, ticket promedio sesión

GanchoTable (TanStack Table v8):
  Columnas: nombre, categoría (badge), índice de atracción, poder de arrastre,
            descuento frecuente (sí/no badge), ticket promedio en sesión
  Filtro: categoria_gancho
  Orden default: poder_arrastre DESC
  Paginación: 20 por página
```

---

## Paleta de colores por segmento RFM

| Segmento | Color |
|---|---|
| VIP | #185FA5 (brand.blue) |
| Leal | #3B6D11 (brand.green) |
| En desarrollo | #EF9F27 (brand.orange) |
| En riesgo | #E24B4A (brand.red) |

## Paleta de colores por categoría gancho

| Categoría | Color |
|---|---|
| Gancho Primario | #185FA5 |
| Gancho Secundario | #3B6D11 |
| Volumen puro | #EF9F27 |
| Nicho estratégico | #9333ea |
