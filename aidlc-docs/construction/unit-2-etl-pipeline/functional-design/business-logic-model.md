# Modelo de Lógica de Negocio — Unit 2: ETL Pipeline

## Entradas

| Archivo | Filas | Columnas clave |
|---|---|---|
| `data/raw/Ventas_Superofertas.xlsx` | ~17.721 | Consecutivo Movimiento, Identificación, Nombre, Teléfono, Fecha, Artículo, Nombre Artículo, Cantidad, Valor Venta Neta, Lista Precio Cliente, Lista Precio Factura, Categoría Terapéutica |
| `data/raw/Remisiones_Mayo_Octubre_Superofertas.xlsx` | ~2.582 | Remision, Identificación, Nombre, Teléfono, Fecha, Artículo, Nombre Artículo, Cantidad, Valor Venta Neta |

**Fecha de referencia fija**: `2025-10-31` (reproducibilidad — NFR-003)

---

## Calculador 1 — `kpis_resumen.json`

```
INPUTS: ventas_df + remisiones_df (todos incluyendo 222222222222)
       churn_count (del calculador 4)
       cruzada_count (del calculador 3)

PROCESO:
  combined = concat(ventas_df, remisiones_df)
  periodo.desde = combined.Fecha.min().strftime('%Y-%m-%d')
  periodo.hasta = combined.Fecha.max().strftime('%Y-%m-%d')
  total_transacciones = combined.session_id.nunique()   # sesiones únicas
  clientes_identificados = combined[~anon].Identificación.nunique()
  ingresos_totales = combined['Valor Venta Neta'].sum()
  ticket_promedio = ingresos_totales / total_transacciones
  clientes_en_riesgo_alto = churn_count
  oportunidades_cruzada = cruzada_count

OUTPUT: kpis_resumen.json (objeto único, no array)
```

---

## Calculador 2 — `ventas_mensuales.json`

```
INPUTS: combined_df (ambos archivos, todos los registros)

PROCESO:
  combined['mes'] = Fecha.dt.to_period('M').astype(str)  # "YYYY-MM"
  por_mes = combined.groupby('mes').agg(
    ingresos = ('Valor Venta Neta', 'sum'),
    transacciones = ('session_id', 'nunique')
  ).reset_index()
  ordenar por mes ASC

OUTPUT: ventas_mensuales.json (array de {mes, ingresos, transacciones})
```

---

## Calculador 3 — `top_productos.json`

```
INPUTS: combined_df (todos los registros — incluye 222222222222)

PROCESO:
  por_producto = combined.groupby(['Artículo', 'Nombre Artículo']).agg(
    unidades = ('Cantidad', 'sum'),
    ingresos = ('Valor Venta Neta', 'sum')
  ).reset_index()
  top10 = por_producto.nlargest(10, 'ingresos')
  renombrar cols: Artículo→codigo, Nombre Artículo→nombre

OUTPUT: top_productos.json (array de {nombre, codigo, unidades, ingresos})
```

---

## Calculador 4 — `ventas_cruzadas.json` (Market Basket)

```
INPUTS: combined_df (todos los registros — incluye 222222222222 para análisis de productos)

FILTRO: sesiones con >= 2 productos distintos

PROCESO:
  1. Por cada sesión: obtener lista de códigos de producto únicos
  2. Para cada par (A, B): contar co-ocurrencias (symmetric)
  3. Para cada par:
     soporte_par = sesiones_con_A_y_B / total_sesiones
     soporte_A = sesiones_con_A / total_sesiones
     soporte_B = sesiones_con_B / total_sesiones
     confianza_A_dado_B = sesiones_con_A_y_B / sesiones_con_A
     lift = confianza_A_dado_B / soporte_B

  4. FILTRO: lift > 1.5 AND veces_juntos >= 10
  5. Para cada par: incremento_ticket_estimado =
       precio_promedio(B) cuando A está en sesión
  6. Incluir categoria_terapeutica del producto_recomendado si disponible
  7. Ordenar por lift DESC, tomar top 500 pares

OUTPUT: ventas_cruzadas.json
```

---

## Calculador 5 — `churn_clientes.json`

```
INPUTS: combined_df FILTRADO: sin Identificación=222222222222, solo clientes con >= 3 compras

PROCESO por cliente:
  compras = sorted(fechas_de_compra ASC)
  dias_entre = diff entre fechas consecutivas
  frecuencia_promedio_dias = mean(dias_entre)
  ultima_compra = max(fechas)
  dias_sin_comprar = (REF_DATE - ultima_compra).days
  churn_score = dias_sin_comprar / frecuencia_promedio_dias

CLASIFICACIÓN:
  si churn_score >= 2.0:  nivel='Alto',  accion='Llamar esta semana'
  si churn_score >= 1.3:  nivel='Medio', accion='Enviar WhatsApp'
  else:                   nivel='Bajo',  accion='Monitorear'

ORDEN: churn_score DESC (más críticos primero)

OUTPUT: churn_clientes.json
```

---

## Calculador 6 — `reposicion_pendiente.json`

```
INPUTS: combined_df FILTRADO: sin Identificación=222222222222, clientes con >= 2 compras del mismo SKU

PROCESO por (cliente, producto):
  compras = sorted(fechas_de_compra_del_SKU ASC)
  si len(compras) < 2: SKIP
  dias_entre = diff entre fechas consecutivas del mismo SKU
  ciclo_dias = mean(dias_entre)
  ultima_compra = max(compras)
  proxima_reposicion = ultima_compra + timedelta(days=ciclo_dias)
  dias_para_reposicion = (proxima_reposicion - REF_DATE).days

CLASIFICACIÓN estado:
  si dias_para_reposicion < 0:   estado='Vencido'
  si dias_para_reposicion <= 7:  estado='Esta semana'
  si dias_para_reposicion <= 30: estado='Próximo mes'
  else: OMITIR (más de 30 días no es urgente para el panel)

ORDEN: dias_para_reposicion ASC (más urgentes primero)

OUTPUT: reposicion_pendiente.json
```

---

## Calculador 7 — `clientes_rfm.json`

```
INPUTS: combined_df FILTRADO: sin Identificación=222222222222

PROCESO:
  Por cliente:
    recency_dias = (REF_DATE - ultima_compra).days
    frequency = número total de sesiones únicas
    monetary = sum(Valor Venta Neta)
    ticket_promedio = monetary / frequency

  Quintiles (1=peor, 5=mejor):
    score_r = 6 - pd.qcut(recency_dias, 5, labels=[1,2,3,4,5])  # invertido
    score_f = pd.qcut(frequency, 5, labels=[1,2,3,4,5], duplicates='drop')
    score_m = pd.qcut(monetary, 5, labels=[1,2,3,4,5], duplicates='drop')

  Segmentación:
    si score_r>=4 AND score_f>=4 AND score_m>=4: segmento='VIP'
    si score_r+score_f+score_m >= 9:             segmento='Leal'
    si score_r+score_f+score_m >= 6:             segmento='En desarrollo'
    else:                                         segmento='En riesgo'

  CLV anual simple:
    meses_periodo = (REF_DATE - primera_compra).days / 30
    frecuencia_mensual = frequency / max(meses_periodo, 1)
    clv_estimado_anual = ticket_promedio * frecuencia_mensual * 12

  churn_score: reusar del calculador 5 (0 si cliente no califica para churn)

ORDEN: monetary DESC

OUTPUT: clientes_rfm.json
```

---

## Calculador 8 — `productos_gancho.json`

```
INPUTS: combined_df (todos los registros — incluye 222222222222)

PROCESO:
  total_sesiones = session_id.nunique()

  Por producto:
    sesiones_con_producto = sesiones donde aparece el producto
    indice_atraccion = len(sesiones_con_producto) / total_sesiones

    poder_arrastre = promedio de (productos_distintos_en_sesion - 1)
                     para sesiones que contienen este producto

    ticket_promedio_en_sesion = promedio del total de la sesión
                                para sesiones que contienen este producto

    tiene_descuento_frecuente:
      trans_producto = ventas con este producto
      descuentos = trans donde Lista Precio Cliente > Lista Precio Factura
      tiene_descuento_frecuente = (descuentos / trans_producto) > 0.30

  Cuartiles para categorización:
    q75_atraccion = percentil 75 de indice_atraccion
    q50_atraccion = percentil 50 de indice_atraccion
    q75_arrastre  = percentil 75 de poder_arrastre
    q50_arrastre  = percentil 50 de poder_arrastre

  Categoría:
    si atraccion >= q75 AND arrastre >= q75:  'Gancho Primario'
    si atraccion >= q75 AND arrastre >= q50:  'Gancho Secundario'
    si atraccion >= q50 AND arrastre < q50:   'Volumen puro'
    else:                                      'Nicho estratégico'

  FILTRO: solo productos con indice_atraccion > 0 (aparecen al menos 1 vez)
  ORDEN: poder_arrastre DESC

OUTPUT: productos_gancho.json
```
