# Plan de Generación de Código — Unit 2: ETL Pipeline

**Workspace root**: `/Users/jdh/Desktop/SellixAI-MVP`  
**Historia implementada**: US-E8-01 · US-E8-02 · US-E8-03

---

## Pasos de Generación

### BLOQUE A — Script ETL
- [x] **Paso 1**: `scripts/etl.py` — script único con 8 calculadores, validación de calidad, serialización JSON
- [x] **Paso 2**: `scripts/requirements.txt` — pandas 2.2.3, openpyxl 3.1.5

### BLOQUE B — Documentación
- [x] **Paso 3**: `aidlc-docs/construction/unit-2-etl-pipeline/code/code-summary.md`

---

## Calculadores implementados en etl.py

| Calculador | Función | Output |
|---|---|---|
| KPIs Resumen | `calc_kpis()` | `kpis_resumen.json` |
| Ventas Mensuales | `calc_ventas_mensuales()` | `ventas_mensuales.json` |
| Top Productos | `calc_top_productos()` | `top_productos.json` |
| Venta Cruzada | `calc_ventas_cruzadas()` | `ventas_cruzadas.json` |
| Churn | `calc_churn()` | `churn_clientes.json` |
| Reposición | `calc_reposicion()` | `reposicion_pendiente.json` |
| RFM | `calc_rfm()` | `clientes_rfm.json` |
| Productos Gancho | `calc_productos_gancho()` | `productos_gancho.json` |
