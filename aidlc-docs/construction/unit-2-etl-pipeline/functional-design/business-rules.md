# Reglas de Negocio — Unit 2: ETL Pipeline

## BR-ETL-01 — Exclusión del consumidor final anónimo
Identificación `222222222222` se excluye de todos los análisis de clientes (churn, reposición, RFM). Se **incluye** en análisis de productos (ventas cruzadas, top productos, productos gancho, ventas mensuales, KPIs).

## BR-ETL-02 — Fecha de referencia fija
`REF_DATE = datetime(2025, 10, 31)` — constante en el script. No usar `datetime.today()`. Garantiza reproducibilidad (NFR-003).

## BR-ETL-03 — Mínimo para churn
Solo clientes con **≥ 3 compras** (sesiones únicas) participan en el análisis de churn.

## BR-ETL-04 — Mínimo para reposición
Solo pares `(cliente, producto)` con **≥ 2 compras del mismo SKU** participan en la predicción de reposición.

## BR-ETL-05 — Filtro de reposición urgente
Solo se exportan registros con `dias_para_reposicion ≤ 30` (Vencido, Esta semana, Próximo mes). Los registros con reposición > 30 días no son urgentes y no se incluyen.

## BR-ETL-06 — Umbral de venta cruzada
Solo pares de productos con **Lift > 1.5** y **veces_juntos ≥ 10 sesiones** se consideran recomendaciones válidas.

## BR-ETL-07 — Sesión de compra
- En Ventas: `Consecutivo Movimiento` identifica la sesión
- En Remisiones: `Remision` identifica la sesión
- Al combinar los dos archivos, se prefija el session_id para evitar colisiones: `V_{consecutivo}` y `R_{remision}`

## BR-ETL-08 — Descuento frecuente
Un producto `tiene_descuento_frecuente = True` si en más del **30%** de sus transacciones en Ventas, el `Lista Precio Cliente > Lista Precio Factura`.

## BR-ETL-09 — Clasificación de riesgo churn

| Churn Score | Nivel | Acción sugerida |
|---|---|---|
| ≥ 2.0 | Alto | Llamar esta semana |
| ≥ 1.3 y < 2.0 | Medio | Enviar WhatsApp |
| < 1.3 | Bajo | Monitorear |

## BR-ETL-10 — Segmentación RFM
- Quintiles calculados sobre la distribución real del dataset (pd.qcut)
- Score R: **invertido** (recency_dias bajo → score 5; alto → score 1)
- Score F y M: directo (mayor valor → mayor score)
- Si hay menos de 5 valores únicos para un quintil, usar `duplicates='drop'`

## BR-ETL-11 — Período del reporte
El campo `periodo` en `kpis_resumen.json` refleja la fecha mínima y máxima real de los datos, no las fechas del script.

## BR-ETL-12 — Encoding y formato JSON
- Todos los JSON se serializan con `ensure_ascii=False` y `indent=2`
- Las fechas en los JSON usan formato ISO: `YYYY-MM-DD`
- Los valores nulos se serializan como `null` (no como cadena vacía)

## BR-ETL-13 — Columnas opcionales
Si alguna columna (`Teléfono`, `Categoría Terapéutica`, `Lista Precio Cliente`) no existe en el archivo de entrada, el script la trata como columna nula y continúa sin error.

## BR-ETL-14 — Calidad de datos
El script imprime `resumen_calidad_datos()` a stdout antes de procesar. Si algún archivo fuente no existe, el script termina con `sys.exit(1)` y mensaje descriptivo.
