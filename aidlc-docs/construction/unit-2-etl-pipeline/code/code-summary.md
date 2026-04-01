# Resumen de Código Generado — Unit 2: ETL Pipeline

**Fecha de generación**: 2026-04-01  
**Estado**: COMPLETADO — 2 archivos generados

---

## Archivos Generados

| Archivo | Descripción |
|---|---|
| `scripts/etl.py` | Script ETL único con 8 calculadores, validación de calidad de datos, serialización JSON |
| `scripts/requirements.txt` | pandas 2.2.3 + openpyxl 3.1.5 |

---

## Instrucciones de Ejecución

### 1. Instalar dependencias Python
```bash
pip install -r scripts/requirements.txt
```

### 2. Colocar archivos Excel en data/raw/
```
data/raw/Ventas_Superofertas.xlsx
data/raw/Remisiones_Mayo_Octubre_Superofertas.xlsx
```

### 3. Ejecutar ETL
```bash
python scripts/etl.py
```

### 4. Verificar salida
```
public/data/
├── kpis_resumen.json
├── ventas_mensuales.json
├── top_productos.json
├── ventas_cruzadas.json
├── churn_clientes.json
├── reposicion_pendiente.json
├── clientes_rfm.json
└── productos_gancho.json
```

### 5. Hacer build del frontend
```bash
npm run build
```

---

## Estructura de etl.py

| Sección | Líneas | Descripción |
|---|---|---|
| Configuración | ~50 | Rutas, constantes, mapas de columnas |
| Utilidades | ~30 | to_iso(), safe_float(), write_json() |
| Carga de datos | ~80 | load_ventas(), load_remisiones(), resumen_calidad_datos() |
| calc_kpis() | ~20 | KPIs del Resumen Ejecutivo |
| calc_ventas_mensuales() | ~20 | Tendencia por mes |
| calc_top_productos() | ~20 | Top 10 por ingresos |
| calc_ventas_cruzadas() | ~60 | Market basket con soporte/confianza/lift |
| calc_churn() | ~50 | Detección de abandono por cliente |
| calc_reposicion() | ~50 | Predicción de reposición urgente |
| calc_rfm() | ~70 | Segmentación RFM con quintiles |
| calc_productos_gancho() | ~70 | Análisis de productos atractores |
| main() | ~30 | Orquestador con validaciones y output |

---

## Reglas de Negocio Aplicadas

| Regla | Implementación |
|---|---|
| BR-ETL-01 | Exclusión de `222222222222` en análisis de clientes |
| BR-ETL-02 | `REF_DATE = datetime(2025, 10, 31)` fija |
| BR-ETL-03 | `MIN_COMPRAS_CHURN = 3` |
| BR-ETL-04 | `MIN_COMPRAS_REPOSICION = 2` |
| BR-ETL-05 | Solo exporta reposiciones con `dias_para_reposicion ≤ 30` |
| BR-ETL-06 | `MIN_LIFT = 1.5`, `MIN_VECES_JUNTOS = 10` |
| BR-ETL-07 | Session IDs prefijados: `V_{id}` y `R_{id}` |
| BR-ETL-08 | `UMBRAL_DESCUENTO = 0.30` (30% de transacciones con descuento) |
| BR-ETL-12 | `ensure_ascii=False`, `indent=2`, fechas ISO |
| BR-ETL-13 | Columnas opcionales con fallback gracioso |
| BR-ETL-14 | `sys.exit(1)` si archivos no existen |
