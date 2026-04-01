# Entidades de Dominio — Unit 2: ETL Pipeline

## Entidades de Entrada

### VentaRow (fila del Excel Ventas)
```
Consecutivo Movimiento  → session_id (prefijado "V_")
Identificación          → cedula (string, puede ser "222222222222")
Nombre                  → nombre (string)
Teléfono                → telefono (string, nullable)
Fecha                   → fecha (datetime)
Artículo                → codigo_producto (string)
Nombre Artículo         → nombre_producto (string)
Cantidad                → cantidad (float)
Valor Venta Neta        → valor_venta_neta (float)
Lista Precio Cliente    → precio_lista (float, nullable)
Lista Precio Factura    → precio_factura (float, nullable)
Categoría Terapéutica   → categoria_terapeutica (string, nullable)
```

### RemisionRow (fila del Excel Remisiones)
```
Remision                → session_id (prefijado "R_")
Identificación          → cedula
Nombre                  → nombre
Teléfono                → telefono (nullable)
Fecha                   → fecha
Artículo                → codigo_producto
Nombre Artículo         → nombre_producto
Cantidad                → cantidad
Valor Venta Neta        → valor_venta_neta
```

## Entidades de Salida (JSON)

### kpis_resumen.json
```json
{
  "total_transacciones": 20303,
  "clientes_unicos": 957,
  "ingresos_totales": 485230000.0,
  "ticket_promedio": 23900.5,
  "clientes_en_riesgo_alto": 47,
  "oportunidades_cruzada": 312,
  "periodo": "Mayo 2025 – Octubre 2025"
}
```

### ventas_mensuales.json
```json
[
  { "mes": "2025-05", "ingresos": 72500000.0, "transacciones": 3012 },
  { "mes": "2025-06", "ingresos": 78200000.0, "transacciones": 3145 }
]
```

### top_productos.json
```json
[
  { "nombre": "Metformina 500mg x 30", "codigo": "00123", "unidades": 4520, "ingresos": 12500000.0 }
]
```

### ventas_cruzadas.json
```json
[
  {
    "producto_base": "Metformina 500mg",
    "producto_recomendado": "Glibenclamida 5mg",
    "veces_juntos": 87,
    "lift": 3.4,
    "confianza": 0.62,
    "incremento_ticket_estimado": 14500.0,
    "categoria_terapeutica": "Antidiabéticos"
  }
]
```

### churn_clientes.json
```json
[
  {
    "cedula": "1082991234",
    "nombre": "JUAN PEREZ GARCIA",
    "telefono": "3001234567",
    "ultima_compra": "2025-07-15",
    "frecuencia_promedio_dias": 22.5,
    "dias_sin_comprar": 108,
    "churn_score": 4.8,
    "nivel_riesgo": "Alto",
    "accion_sugerida": "Llamar esta semana"
  }
]
```

### reposicion_pendiente.json
```json
[
  {
    "cedula": "1082991234",
    "nombre": "JUAN PEREZ GARCIA",
    "telefono": "3001234567",
    "producto": "Atorvastatina 20mg x 30",
    "ultima_compra": "2025-10-10",
    "ciclo_dias": 30.0,
    "proxima_reposicion": "2025-11-09",
    "dias_para_reposicion": 9,
    "estado": "Esta semana"
  }
]
```

### clientes_rfm.json
```json
[
  {
    "cedula": "1082991234",
    "nombre": "JUAN PEREZ GARCIA",
    "recency_dias": 5,
    "frequency": 24,
    "monetary": 1850000.0,
    "score_r": 5,
    "score_f": 5,
    "score_m": 4,
    "segmento": "VIP",
    "clv_estimado_anual": 4440000.0,
    "churn_score": 0.2,
    "ticket_promedio": 77083.3,
    "ultima_compra": "2025-10-26"
  }
]
```

### productos_gancho.json
```json
[
  {
    "codigo": "00123",
    "nombre": "Metformina 500mg x 30",
    "categoria_gancho": "Gancho Primario",
    "indice_atraccion": 0.18,
    "poder_arrastre": 3.2,
    "tiene_descuento_frecuente": false,
    "ticket_promedio_en_sesion": 45200.0
  }
]
```
