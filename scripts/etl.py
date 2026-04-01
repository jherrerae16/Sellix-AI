"""
Sellix AI — ETL Pipeline
========================
Transforma los archivos Excel de ventas en 8 archivos JSON estáticos
para consumo del dashboard Next.js.

Uso:
    python scripts/etl.py

Requiere:
    pip install pandas openpyxl

Salida: public/data/*.json
"""

import sys
import json
import os
from pathlib import Path
from datetime import datetime, timedelta
from itertools import combinations

import pandas as pd

# =============================================================
# CONFIGURACIÓN
# =============================================================

ROOT_DIR = Path(__file__).parent.parent
DATA_RAW_DIR = ROOT_DIR / "data" / "raw"
OUTPUT_DIR = ROOT_DIR / "public" / "data"

VENTAS_FILE = DATA_RAW_DIR / "Ventas_Superofertas.xlsx"
REMISIONES_FILE = DATA_RAW_DIR / "Remisiones_Mayo_Octubre_Superofertas.xlsx"

REF_DATE = datetime(2025, 10, 31)  # Fija para reproducibilidad (BR-ETL-02)
ANONIMO_ID = "222222222222"         # Consumidor final (BR-ETL-01)

MIN_COMPRAS_CHURN = 3               # BR-ETL-03
MIN_COMPRAS_REPOSICION = 2          # BR-ETL-04
MAX_DIAS_REPOSICION = 30            # BR-ETL-05
MIN_LIFT = 1.5                      # BR-ETL-06
MIN_VECES_JUNTOS = 10              # BR-ETL-06
UMBRAL_DESCUENTO = 0.30             # BR-ETL-08

# Mapas de columnas esperadas en los Excel
VENTAS_COLS = {
    "session": "Consecutivo Movimiento",
    "cedula": "Identificación",
    "nombre": "Nombre",
    "telefono": "Teléfono",
    "fecha": "Fecha",
    "codigo": "Artículo",
    "nombre_prod": "Nombre Artículo",
    "cantidad": "Cantidad",
    "valor": "Valor Venta Neta",
    "precio_lista": "Lista Precio Cliente",
    "precio_factura": "Lista Precio Factura",
    "categoria": "Categoría Terapéutica",
}

REMISIONES_COLS = {
    "session": "Remision",
    "cedula": "Identificación",
    "nombre": "Nombre",
    "telefono": "Teléfono",
    "fecha": "Fecha",
    "codigo": "Artículo",
    "nombre_prod": "Nombre Artículo",
    "cantidad": "Cantidad",
    "valor": "Valor Venta Neta",
}


# =============================================================
# UTILIDADES
# =============================================================

def to_iso(dt) -> str | None:
    """Convierte datetime/date a string ISO YYYY-MM-DD."""
    if pd.isna(dt):
        return None
    if isinstance(dt, str):
        return dt[:10]
    return dt.strftime("%Y-%m-%d")


def safe_float(val, default=0.0) -> float:
    try:
        v = float(val)
        return v if not pd.isna(v) else default
    except (TypeError, ValueError):
        return default


def write_json(data, filename: str) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUTPUT_DIR / filename
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=str)
    print(f"  ✓ {filename} ({len(data) if isinstance(data, list) else 1} registros)")


# =============================================================
# CARGA Y NORMALIZACIÓN DE DATOS
# =============================================================

def _get_col(df: pd.DataFrame, col_name: str, default=None) -> pd.Series:
    """Devuelve la columna si existe, de lo contrario una serie de `default`."""
    if col_name in df.columns:
        return df[col_name]
    return pd.Series([default] * len(df), index=df.index)


def load_ventas() -> pd.DataFrame:
    print(f"  Cargando Ventas: {VENTAS_FILE.name}")
    df = pd.read_excel(VENTAS_FILE, dtype=str)
    df.columns = df.columns.str.strip()

    c = VENTAS_COLS
    result = pd.DataFrame()
    result["session_id"] = "V_" + df[c["session"]].astype(str).str.strip()
    result["cedula"] = df[c["cedula"]].astype(str).str.strip()
    result["nombre"] = df[c["nombre"]].astype(str).str.strip()
    result["telefono"] = _get_col(df, c["telefono"]).astype(str).replace("nan", None)
    result["fecha"] = pd.to_datetime(df[c["fecha"]], dayfirst=True, errors="coerce")
    result["codigo"] = df[c["codigo"]].astype(str).str.strip()
    result["nombre_producto"] = df[c["nombre_prod"]].astype(str).str.strip()
    result["cantidad"] = pd.to_numeric(df[c["cantidad"]], errors="coerce").fillna(0)
    result["valor"] = pd.to_numeric(df[c["valor"]], errors="coerce").fillna(0)
    result["precio_lista"] = pd.to_numeric(
        _get_col(df, c["precio_lista"], None), errors="coerce"
    )
    result["precio_factura"] = pd.to_numeric(
        _get_col(df, c["precio_factura"], None), errors="coerce"
    )
    result["categoria"] = _get_col(df, c["categoria"], None).astype(str).replace("nan", None)
    result["fuente"] = "ventas"
    return result.dropna(subset=["fecha"])


def load_remisiones() -> pd.DataFrame:
    print(f"  Cargando Remisiones: {REMISIONES_FILE.name}")
    df = pd.read_excel(REMISIONES_FILE, dtype=str)
    df.columns = df.columns.str.strip()

    c = REMISIONES_COLS
    result = pd.DataFrame()
    result["session_id"] = "R_" + df[c["session"]].astype(str).str.strip()
    result["cedula"] = df[c["cedula"]].astype(str).str.strip()
    result["nombre"] = df[c["nombre"]].astype(str).str.strip()
    result["telefono"] = _get_col(df, c["telefono"]).astype(str).replace("nan", None)
    result["fecha"] = pd.to_datetime(df[c["fecha"]], dayfirst=True, errors="coerce")
    result["codigo"] = df[c["codigo"]].astype(str).str.strip()
    result["nombre_producto"] = df[c["nombre_prod"]].astype(str).str.strip()
    result["cantidad"] = pd.to_numeric(df[c["cantidad"]], errors="coerce").fillna(0)
    result["valor"] = pd.to_numeric(df[c["valor"]], errors="coerce").fillna(0)
    result["precio_lista"] = None
    result["precio_factura"] = None
    result["categoria"] = None
    result["fuente"] = "remisiones"
    return result.dropna(subset=["fecha"])


def resumen_calidad_datos(ventas: pd.DataFrame, remisiones: pd.DataFrame) -> None:
    combined = pd.concat([ventas, remisiones], ignore_index=True)
    identificados = combined[combined["cedula"] != ANONIMO_ID]

    # Clientes con >= 3 compras para churn
    compras_por_cliente = (
        identificados.groupby("cedula")["session_id"].nunique()
    )
    aptos_churn = (compras_por_cliente >= MIN_COMPRAS_CHURN).sum()

    # Pares cliente-producto con >= 2 compras del mismo SKU
    pares = (
        identificados.groupby(["cedula", "codigo"])["session_id"]
        .nunique()
    )
    aptos_repos = (pares >= MIN_COMPRAS_REPOSICION).sum()

    print("\n=== SELLIX AI — RESUMEN DE CALIDAD DE DATOS ===")
    print(f"Ventas: {len(ventas):,} registros | {ventas['fecha'].min().date()} – {ventas['fecha'].max().date()}")
    print(f"Remisiones: {len(remisiones):,} registros | {remisiones['fecha'].min().date()} – {remisiones['fecha'].max().date()}")
    print(f"Clientes identificados: {identificados['cedula'].nunique():,} (cédulas válidas)")
    print(f"Clientes anónimos (consumidor final): 1 ID excluido del CRM")
    print(f"Productos únicos: {ventas['codigo'].nunique():,} SKUs en Ventas | {remisiones['codigo'].nunique():,} en Remisiones")
    print(f"Clientes con ≥{MIN_COMPRAS_CHURN} compras (aptos para churn): {aptos_churn:,}")
    print(f"Pares cliente-producto aptos para reposición: {aptos_repos:,}")
    null_tel = combined["telefono"].isna().sum() / len(combined) * 100
    print(f"Campos con valores nulos: Teléfono ({null_tel:.0f}%)")
    print("===============================================\n")


# =============================================================
# CALCULADOR 1 — kpis_resumen.json
# =============================================================

def calc_kpis(combined: pd.DataFrame, churn_alto: int, cruzada_count: int) -> dict:
    sin_anon = combined[combined["cedula"] != ANONIMO_ID]
    fecha_min = combined["fecha"].min()
    fecha_max = combined["fecha"].max()
    meses = [
        datetime(fecha_min.year, fecha_min.month, 1).strftime("%B %Y"),
        datetime(fecha_max.year, fecha_max.month, 1).strftime("%B %Y"),
    ]
    periodo = f"{meses[0]} – {meses[1]}" if meses[0] != meses[1] else meses[0]

    total_transacciones = combined["session_id"].nunique()
    clientes_unicos = sin_anon["cedula"].nunique()
    ingresos_totales = float(combined["valor"].sum())
    ticket_promedio = ingresos_totales / total_transacciones if total_transacciones else 0.0

    return {
        "total_transacciones": int(total_transacciones),
        "clientes_unicos": int(clientes_unicos),
        "ingresos_totales": round(ingresos_totales, 2),
        "ticket_promedio": round(ticket_promedio, 2),
        "clientes_en_riesgo_alto": int(churn_alto),
        "oportunidades_cruzada": int(cruzada_count),
        "periodo": periodo,
    }


# =============================================================
# CALCULADOR 2 — ventas_mensuales.json
# =============================================================

def calc_ventas_mensuales(combined: pd.DataFrame) -> list:
    df = combined.copy()
    df["mes"] = df["fecha"].dt.to_period("M").astype(str)
    result = (
        df.groupby("mes")
        .agg(
            ingresos=("valor", "sum"),
            transacciones=("session_id", "nunique"),
        )
        .reset_index()
        .sort_values("mes")
    )
    return [
        {
            "mes": row["mes"],
            "ingresos": round(float(row["ingresos"]), 2),
            "transacciones": int(row["transacciones"]),
        }
        for _, row in result.iterrows()
    ]


# =============================================================
# CALCULADOR 3 — top_productos.json
# =============================================================

def calc_top_productos(combined: pd.DataFrame, top_n: int = 10) -> list:
    result = (
        combined.groupby(["codigo", "nombre_producto"])
        .agg(
            unidades=("cantidad", "sum"),
            ingresos=("valor", "sum"),
        )
        .reset_index()
        .nlargest(top_n, "ingresos")
    )
    return [
        {
            "nombre": row["nombre_producto"],
            "codigo": row["codigo"],
            "unidades": int(row["unidades"]),
            "ingresos": round(float(row["ingresos"]), 2),
        }
        for _, row in result.iterrows()
    ]


# =============================================================
# CALCULADOR 4 — ventas_cruzadas.json (Market Basket)
# =============================================================

def calc_ventas_cruzadas(combined: pd.DataFrame) -> list:
    # Sesiones con >= 2 productos distintos
    sesiones = (
        combined.groupby("session_id")["codigo"]
        .apply(lambda x: list(x.unique()))
        .reset_index()
    )
    sesiones = sesiones[sesiones["codigo"].apply(len) >= 2]
    total_sesiones = len(sesiones)

    if total_sesiones == 0:
        return []

    # Contar apariciones de cada producto
    conteo_producto: dict[str, int] = {}
    conteo_par: dict[tuple, int] = {}

    for _, row in sesiones.iterrows():
        productos = row["codigo"]
        for p in productos:
            conteo_producto[p] = conteo_producto.get(p, 0) + 1
        for a, b in combinations(sorted(productos), 2):
            key = (a, b)
            conteo_par[key] = conteo_par.get(key, 0) + 1

    # Mapa código → nombre y categoría
    nombre_map = combined.groupby("codigo")["nombre_producto"].first().to_dict()
    cat_map = {}
    if "categoria" in combined.columns:
        cat_map = combined.dropna(subset=["categoria"]).groupby("codigo")["categoria"].first().to_dict()

    # Mapa código → precio promedio para ticket estimado
    precio_map = combined.groupby("codigo")["valor"].mean().to_dict()

    resultados = []
    for (a, b), veces in conteo_par.items():
        if veces < MIN_VECES_JUNTOS:
            continue
        soporte_a = conteo_producto.get(a, 0) / total_sesiones
        soporte_b = conteo_producto.get(b, 0) / total_sesiones
        if soporte_a == 0 or soporte_b == 0:
            continue
        confianza = veces / conteo_producto.get(a, 1)
        lift = confianza / soporte_b

        if lift < MIN_LIFT:
            continue

        # Ambas direcciones (A→B y B→A)
        for base, rec in [(a, b), (b, a)]:
            conf = veces / conteo_producto.get(base, 1)
            lft = conf / (conteo_producto.get(rec, 1) / total_sesiones)
            if lft < MIN_LIFT:
                continue
            ticket_est = round(safe_float(precio_map.get(rec, 0)), 0)
            entry = {
                "producto_base": nombre_map.get(base, base),
                "producto_recomendado": nombre_map.get(rec, rec),
                "veces_juntos": int(veces),
                "lift": round(float(lft), 2),
                "confianza": round(float(conf), 4),
                "incremento_ticket_estimado": ticket_est,
            }
            if rec in cat_map:
                entry["categoria_terapeutica"] = cat_map[rec]
            resultados.append(entry)

    # Deduplicar y ordenar por lift DESC
    resultados.sort(key=lambda x: x["lift"], reverse=True)
    # Tomar top 500
    return resultados[:500]


# =============================================================
# CALCULADOR 5 — churn_clientes.json
# =============================================================

def calc_churn(combined: pd.DataFrame) -> tuple[list, int]:
    """Retorna (lista_churn, count_alto)."""
    sin_anon = combined[combined["cedula"] != ANONIMO_ID].copy()

    # Sesiones por cliente con fecha
    sesiones_cliente = (
        sin_anon.groupby(["cedula", "session_id"])
        .agg(fecha=("fecha", "min"), nombre=("nombre", "first"), telefono=("telefono", "first"))
        .reset_index()
    )

    # Solo clientes con >= MIN_COMPRAS_CHURN sesiones
    conteo = sesiones_cliente.groupby("cedula")["session_id"].count()
    clientes_aptos = conteo[conteo >= MIN_COMPRAS_CHURN].index
    sesiones_cliente = sesiones_cliente[sesiones_cliente["cedula"].isin(clientes_aptos)]

    resultados = []
    for cedula, grupo in sesiones_cliente.groupby("cedula"):
        fechas = sorted(grupo["fecha"].tolist())
        if len(fechas) < MIN_COMPRAS_CHURN:
            continue

        diferencias = [(fechas[i + 1] - fechas[i]).days for i in range(len(fechas) - 1)]
        frecuencia = sum(diferencias) / len(diferencias) if diferencias else None

        if frecuencia is None or frecuencia <= 0:
            continue

        ultima = fechas[-1]
        dias_sin_comprar = (REF_DATE - ultima).days
        churn_score = dias_sin_comprar / frecuencia

        if churn_score >= 2.0:
            nivel = "Alto"
            accion = "Llamar esta semana"
        elif churn_score >= 1.3:
            nivel = "Medio"
            accion = "Enviar WhatsApp"
        else:
            nivel = "Bajo"
            accion = "Monitorear"

        info = grupo.iloc[0]
        resultados.append({
            "cedula": str(cedula),
            "nombre": str(info["nombre"]),
            "telefono": info["telefono"] if pd.notna(info["telefono"]) else None,
            "ultima_compra": to_iso(ultima),
            "frecuencia_promedio_dias": round(float(frecuencia), 1),
            "dias_sin_comprar": int(dias_sin_comprar),
            "churn_score": round(float(churn_score), 2),
            "nivel_riesgo": nivel,
            "accion_sugerida": accion,
        })

    resultados.sort(key=lambda x: x["churn_score"], reverse=True)
    churn_alto = sum(1 for r in resultados if r["nivel_riesgo"] == "Alto")
    return resultados, churn_alto


# =============================================================
# CALCULADOR 6 — reposicion_pendiente.json
# =============================================================

def calc_reposicion(combined: pd.DataFrame) -> list:
    sin_anon = combined[combined["cedula"] != ANONIMO_ID].copy()

    # Sesiones por (cliente, producto)
    sesiones = (
        sin_anon.groupby(["cedula", "codigo", "session_id"])
        .agg(
            fecha=("fecha", "min"),
            nombre=("nombre", "first"),
            telefono=("telefono", "first"),
            nombre_producto=("nombre_producto", "first"),
        )
        .reset_index()
    )

    resultados = []
    for (cedula, codigo), grupo in sesiones.groupby(["cedula", "codigo"]):
        fechas = sorted(grupo["fecha"].tolist())
        if len(fechas) < MIN_COMPRAS_REPOSICION:
            continue

        diferencias = [(fechas[i + 1] - fechas[i]).days for i in range(len(fechas) - 1)]
        ciclo = sum(diferencias) / len(diferencias) if diferencias else None

        if ciclo is None or ciclo <= 0:
            continue

        ultima = fechas[-1]
        proxima = ultima + timedelta(days=ciclo)
        dias_para = (proxima - REF_DATE).days

        if dias_para > MAX_DIAS_REPOSICION:
            continue  # No urgente (BR-ETL-05)

        if dias_para < 0:
            estado = "Vencido"
        elif dias_para <= 7:
            estado = "Esta semana"
        else:
            estado = "Próximo mes"

        info = grupo.iloc[0]
        resultados.append({
            "cedula": str(cedula),
            "nombre": str(info["nombre"]),
            "telefono": info["telefono"] if pd.notna(info["telefono"]) else None,
            "producto": str(info["nombre_producto"]),
            "ultima_compra": to_iso(ultima),
            "ciclo_dias": round(float(ciclo), 1),
            "proxima_reposicion": to_iso(proxima),
            "dias_para_reposicion": int(dias_para),
            "estado": estado,
        })

    resultados.sort(key=lambda x: x["dias_para_reposicion"])
    return resultados


# =============================================================
# CALCULADOR 7 — clientes_rfm.json
# =============================================================

def calc_rfm(combined: pd.DataFrame, churn_data: list) -> list:
    sin_anon = combined[combined["cedula"] != ANONIMO_ID].copy()

    # Churn scores por cédula para incluir en RFM
    churn_map = {r["cedula"]: r["churn_score"] for r in churn_data}

    # Métricas base por cliente
    por_sesion = sin_anon.groupby(["cedula", "session_id"]).agg(
        fecha=("fecha", "min"),
        valor_sesion=("valor", "sum"),
        nombre=("nombre", "first"),
    ).reset_index()

    rfm = por_sesion.groupby("cedula").agg(
        ultima_compra=("fecha", "max"),
        primera_compra=("fecha", "min"),
        frequency=("session_id", "nunique"),
        monetary=("valor_sesion", "sum"),
        nombre=("nombre", "first"),
    ).reset_index()

    rfm["recency_dias"] = (REF_DATE - rfm["ultima_compra"]).dt.days
    rfm["ticket_promedio"] = rfm["monetary"] / rfm["frequency"]

    # Quintiles (BR-ETL-10)
    def quintile_rank(series: pd.Series, ascending: bool = True) -> pd.Series:
        try:
            labels = [1, 2, 3, 4, 5] if ascending else [5, 4, 3, 2, 1]
            return pd.qcut(series, q=5, labels=labels, duplicates="drop").astype(int)
        except Exception:
            # Fallback si no hay suficientes valores únicos
            return pd.Series([3] * len(series), index=series.index)

    rfm["score_r"] = quintile_rank(rfm["recency_dias"], ascending=False)  # menor recency → mayor score
    rfm["score_f"] = quintile_rank(rfm["frequency"], ascending=True)
    rfm["score_m"] = quintile_rank(rfm["monetary"], ascending=True)

    def segmento(row) -> str:
        r, f, m = int(row["score_r"]), int(row["score_f"]), int(row["score_m"])
        total = r + f + m
        if r >= 4 and f >= 4 and m >= 4:
            return "VIP"
        elif total >= 9:
            return "Leal"
        elif total >= 6:
            return "En desarrollo"
        else:
            return "En riesgo"

    rfm["segmento"] = rfm.apply(segmento, axis=1)

    # CLV anual simple: ticket_promedio × frecuencia_mensual × 12
    rfm["meses_periodo"] = (
        (rfm["ultima_compra"] - rfm["primera_compra"]).dt.days / 30
    ).clip(lower=1)
    rfm["frecuencia_mensual"] = rfm["frequency"] / rfm["meses_periodo"]
    rfm["clv_estimado_anual"] = rfm["ticket_promedio"] * rfm["frecuencia_mensual"] * 12

    resultados = []
    for _, row in rfm.sort_values("monetary", ascending=False).iterrows():
        cedula = str(row["cedula"])
        resultados.append({
            "cedula": cedula,
            "nombre": str(row["nombre"]),
            "recency_dias": int(row["recency_dias"]),
            "frequency": int(row["frequency"]),
            "monetary": round(float(row["monetary"]), 2),
            "score_r": int(row["score_r"]),
            "score_f": int(row["score_f"]),
            "score_m": int(row["score_m"]),
            "segmento": row["segmento"],
            "clv_estimado_anual": round(float(row["clv_estimado_anual"]), 2),
            "churn_score": round(float(churn_map.get(cedula, 0.0)), 2),
            "ticket_promedio": round(float(row["ticket_promedio"]), 2),
            "ultima_compra": to_iso(row["ultima_compra"]),
        })

    return resultados


# =============================================================
# CALCULADOR 8 — productos_gancho.json
# =============================================================

def calc_productos_gancho(combined: pd.DataFrame, ventas_df: pd.DataFrame) -> list:
    total_sesiones = combined["session_id"].nunique()
    if total_sesiones == 0:
        return []

    # Por sesión: lista de productos y total de sesión
    sesion_info = combined.groupby("session_id").agg(
        productos=("codigo", lambda x: list(x.unique())),
        total_sesion=("valor", "sum"),
    ).reset_index()

    # Crear un dict por producto con sus métricas
    prod_sesiones: dict[str, list] = {}  # codigo → [totales de sesión]
    prod_arrastre: dict[str, list] = {}  # codigo → [count de otros productos en sesión]

    for _, row in sesion_info.iterrows():
        prods = row["productos"]
        total = row["total_sesion"]
        for p in prods:
            prod_sesiones.setdefault(p, []).append(total)
            prod_arrastre.setdefault(p, []).append(len(prods) - 1)

    # Mapa código → nombre
    nombre_map = combined.groupby("codigo")["nombre_producto"].first().to_dict()

    # Descuento frecuente (solo en ventas, BR-ETL-08)
    descuento_map: dict[str, bool] = {}
    if "precio_lista" in ventas_df.columns and "precio_factura" in ventas_df.columns:
        vdf = ventas_df.dropna(subset=["precio_lista", "precio_factura"])
        if len(vdf) > 0:
            vdf = vdf.copy()
            vdf["con_descuento"] = vdf["precio_lista"] > vdf["precio_factura"]
            desc_ratio = (
                vdf.groupby("codigo")["con_descuento"]
                .mean()
            )
            descuento_map = (desc_ratio > UMBRAL_DESCUENTO).to_dict()

    # Construir métricas por producto
    metricas = []
    for codigo, totales in prod_sesiones.items():
        n_sesiones = len(totales)
        indice_atraccion = n_sesiones / total_sesiones
        poder_arrastre = sum(prod_arrastre.get(codigo, [0])) / max(n_sesiones, 1)
        ticket_promedio_sesion = sum(totales) / n_sesiones

        metricas.append({
            "codigo": codigo,
            "nombre": nombre_map.get(codigo, codigo),
            "n_sesiones": n_sesiones,
            "indice_atraccion": indice_atraccion,
            "poder_arrastre": poder_arrastre,
            "ticket_promedio_en_sesion": ticket_promedio_sesion,
            "tiene_descuento_frecuente": bool(descuento_map.get(codigo, False)),
        })

    if not metricas:
        return []

    df_m = pd.DataFrame(metricas)

    # Cuartiles para categorización
    q75_atr = df_m["indice_atraccion"].quantile(0.75)
    q50_atr = df_m["indice_atraccion"].quantile(0.50)
    q75_arr = df_m["poder_arrastre"].quantile(0.75)
    q50_arr = df_m["poder_arrastre"].quantile(0.50)

    def categorizar(row) -> str:
        atr = row["indice_atraccion"]
        arr = row["poder_arrastre"]
        if atr >= q75_atr and arr >= q75_arr:
            return "Gancho Primario"
        elif atr >= q75_atr and arr >= q50_arr:
            return "Gancho Secundario"
        elif atr >= q50_atr and arr < q50_arr:
            return "Volumen puro"
        else:
            return "Nicho estratégico"

    df_m["categoria_gancho"] = df_m.apply(categorizar, axis=1)
    df_m = df_m.sort_values("poder_arrastre", ascending=False)

    return [
        {
            "codigo": row["codigo"],
            "nombre": row["nombre"],
            "categoria_gancho": row["categoria_gancho"],
            "indice_atraccion": round(float(row["indice_atraccion"]), 4),
            "poder_arrastre": round(float(row["poder_arrastre"]), 2),
            "tiene_descuento_frecuente": row["tiene_descuento_frecuente"],
            "ticket_promedio_en_sesion": round(float(row["ticket_promedio_en_sesion"]), 2),
        }
        for _, row in df_m.iterrows()
    ]


# =============================================================
# MAIN
# =============================================================

def main() -> None:
    print("\n🚀 Sellix AI — ETL Pipeline")
    print("=" * 50)

    # Validar archivos de entrada (BR-ETL-14)
    for f in [VENTAS_FILE, REMISIONES_FILE]:
        if not f.exists():
            print(f"\n❌ Error: Archivo no encontrado: {f}")
            print(f"   Coloque los archivos Excel en: {DATA_RAW_DIR}")
            sys.exit(1)

    print("\n📥 Cargando archivos fuente...")
    ventas = load_ventas()
    remisiones = load_remisiones()
    combined = pd.concat([ventas, remisiones], ignore_index=True)

    resumen_calidad_datos(ventas, remisiones)

    print("⚙️  Calculando módulos...")

    # Orden de cálculo: churn y cruzada primero para kpis
    churn_data, churn_alto = calc_churn(combined)
    cruzada_data = calc_ventas_cruzadas(combined)

    kpis = calc_kpis(combined, churn_alto, len(cruzada_data))
    ventas_mensuales = calc_ventas_mensuales(combined)
    top_productos = calc_top_productos(combined)
    reposicion = calc_reposicion(combined)
    rfm = calc_rfm(combined, churn_data)
    gancho = calc_productos_gancho(combined, ventas)

    print(f"\n💾 Escribiendo JSON en: {OUTPUT_DIR}")
    write_json(kpis, "kpis_resumen.json")
    write_json(ventas_mensuales, "ventas_mensuales.json")
    write_json(top_productos, "top_productos.json")
    write_json(cruzada_data, "ventas_cruzadas.json")
    write_json(churn_data, "churn_clientes.json")
    write_json(reposicion, "reposicion_pendiente.json")
    write_json(rfm, "clientes_rfm.json")
    write_json(gancho, "productos_gancho.json")

    print(f"\n✅ ETL completado exitosamente.")
    print(f"   Clientes en riesgo alto (churn): {churn_alto}")
    print(f"   Pares de venta cruzada (lift>{MIN_LIFT}): {len(cruzada_data)}")
    print(f"   Predicciones de reposición urgentes: {len(reposicion)}")
    print(f"   Clientes segmentados RFM: {len(rfm)}")
    print(f"   Productos gancho analizados: {len(gancho)}")
    print(f"\n   Siguiente paso: npm run build\n")


if __name__ == "__main__":
    main()
