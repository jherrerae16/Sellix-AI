-- =============================================================
-- Sellix AI — Migración 002: Ontología genérica (PRD v4.0, Fase B)
--
-- ESTRATEGIA: expand-contract, CERO DOWNTIME.
--
-- Esta migración NO renombra columnas. Añade las columnas genéricas
-- junto a las farmacéuticas y copia los datos. Ambos vocabularios
-- coexisten, así que el código viejo (en producción durante el build
-- de Vercel) y el nuevo funcionan simultáneamente.
--
-- Un trigger de sincronización bidireccional mantiene ambas caras
-- coherentes mientras dure la convivencia: escriba quien escriba,
-- las dos columnas quedan iguales.
--
-- La migración 004 (contract) elimina las columnas viejas, y se
-- aplica solo cuando ningún código en producción las use.
--
--   categoria_terapeutica  →  categoria              (nivel 1)
--   subcategoria           →  subcategoria           (nivel 2, sin cambio)
--   tratamiento            →  afinidad               (nivel 3)
--   tipo_tratamiento       →  tipo_afinidad
--   es_cronico             →  es_ancla
--   es_receta              →  requiere_autorizacion
--   principio_activo       →  atributo_clave
--   categoria_atc          →  codigo_externo
--
-- Idempotente: se puede correr varias veces sin efecto adicional.
-- =============================================================

BEGIN;

-- ── 1. EXPAND: columnas genéricas junto a las farmacéuticas ──
-- Los booleanos se crean SIN default: necesitan quedar NULL para que
-- la copia de abajo distinga "todavía no migrado" de "migrado a false".
-- Con DEFAULT false, un es_cronico=true se perdería silenciosamente y
-- el churn de ancla —la acción crítica #1 del NBA— se vaciaría.
ALTER TABLE productos_master
  ADD COLUMN IF NOT EXISTS categoria              TEXT,
  ADD COLUMN IF NOT EXISTS afinidad               TEXT,
  ADD COLUMN IF NOT EXISTS tipo_afinidad          TEXT,
  ADD COLUMN IF NOT EXISTS es_ancla               BOOLEAN,
  ADD COLUMN IF NOT EXISTS requiere_autorizacion  BOOLEAN,
  ADD COLUMN IF NOT EXISTS atributo_clave         TEXT,
  ADD COLUMN IF NOT EXISTS codigo_externo         TEXT,
  -- La taxonomía de un código solo es válida dentro del pack bajo el
  -- que se clasificó (PRD §5.3): un código clasificado como
  -- farmacéutico no sirve a un pet shop.
  ADD COLUMN IF NOT EXISTS pack_id                TEXT NOT NULL DEFAULT '001';

-- Copia inicial de datos: v3 → v4. Incondicional en toda la tabla:
-- un WHERE selectivo dejaría filas a medio migrar (los booleanos no
-- se pueden filtrar por IS NULL igual que los textos).
UPDATE productos_master SET
  categoria             = COALESCE(categoria, categoria_terapeutica),
  afinidad              = COALESCE(afinidad, tratamiento),
  tipo_afinidad         = COALESCE(tipo_afinidad, tipo_tratamiento),
  es_ancla              = COALESCE(es_ancla, es_cronico, false),
  requiere_autorizacion = COALESCE(requiere_autorizacion, es_receta, false),
  atributo_clave        = COALESCE(atributo_clave, principio_activo),
  codigo_externo        = COALESCE(codigo_externo, categoria_atc);

-- Ya migrados los datos, se fijan los defaults para las filas futuras.
ALTER TABLE productos_master
  ALTER COLUMN es_ancla              SET DEFAULT false,
  ALTER COLUMN requiere_autorizacion SET DEFAULT false;

-- Guardia: ninguna fila puede quedar con dato legado sin equivalente
-- genérico. Si esto dispara, la migración revierte entera.
DO $$
DECLARE perdidas INTEGER;
BEGIN
  SELECT COUNT(*) INTO perdidas FROM productos_master
  WHERE (categoria_terapeutica IS NOT NULL AND categoria      IS NULL)
     OR (tratamiento           IS NOT NULL AND afinidad       IS NULL)
     OR (principio_activo      IS NOT NULL AND atributo_clave IS NULL)
     OR (es_cronico = true     AND es_ancla IS DISTINCT FROM true)
     OR (es_receta  = true     AND requiere_autorizacion IS DISTINCT FROM true);
  IF perdidas > 0 THEN
    RAISE EXCEPTION 'Abortado: % filas no migraron correctamente a la ontología genérica.', perdidas;
  END IF;
END $$;

COMMENT ON TABLE productos_master IS
  'Catálogo global de taxonomía, compartido entre tenants para amortizar el costo de clasificación por LLM. '
  'EXENTA DE RLS de forma intencional (PRD v4.0 §7.2): no contiene PII ni precios, solo taxonomía de producto. '
  'La validez de una clasificación está acotada por pack_id. '
  'CONVIVENCIA: las columnas farmacéuticas (categoria_terapeutica, tratamiento, ...) son legado v3 '
  'y se eliminan en la migración 004. Usar SIEMPRE las genéricas en código nuevo.';

COMMENT ON COLUMN productos_master.categoria      IS 'Ontología nivel 1. Farmacia: categoría terapéutica. Pet shop: categoría.';
COMMENT ON COLUMN productos_master.subcategoria   IS 'Ontología nivel 2. Farmacia: grupo farmacológico. Pet shop: línea.';
COMMENT ON COLUMN productos_master.afinidad       IS 'Ontología nivel 3. Agrupa productos que un cliente compra en secuencia por una razón compartida. Farmacia: tratamiento.';
COMMENT ON COLUMN productos_master.tipo_afinidad  IS 'continua|puntual|ocasional|preventiva|no_aplica. Farmacia v3: cronico|agudo|ocasional|preventivo|no_aplica.';
COMMENT ON COLUMN productos_master.es_ancla       IS 'Producto cuyo abandono es señal crítica de churn. Farmacia: medicamento crónico. Pet shop: alimento.';
COMMENT ON COLUMN productos_master.requiere_autorizacion IS 'Requiere receta, permiso o licencia para su venta.';
COMMENT ON COLUMN productos_master.atributo_clave IS 'Atributo que define equivalencia funcional. Farmacia: principio activo. Repuestos: compatibilidad.';
COMMENT ON COLUMN productos_master.codigo_externo IS 'Código de taxonomía estándar del vertical. Farmacia: ATC.';

CREATE INDEX IF NOT EXISTS productos_master_categoria_gen_idx ON productos_master(categoria);
CREATE INDEX IF NOT EXISTS productos_master_afinidad_idx      ON productos_master(afinidad);
CREATE INDEX IF NOT EXISTS productos_master_pack_idx          ON productos_master(pack_id);
CREATE INDEX IF NOT EXISTS productos_master_ancla_idx         ON productos_master(es_ancla) WHERE es_ancla;

-- ── 2. Sincronización bidireccional durante la convivencia ───
-- Mientras código viejo y nuevo corran a la vez, cualquier escritura
-- por una cara debe reflejarse en la otra. El trigger copia desde el
-- lado que cambió; si cambian ambos, gana el genérico (código nuevo).
--
-- SE ELIMINA en la migración 004 junto con las columnas legado.
CREATE OR REPLACE FUNCTION sync_ontologia_v3_v4() RETURNS TRIGGER AS $$
BEGIN
  -- v4 → v3 (el código nuevo escribió las genéricas)
  IF TG_OP = 'INSERT' OR NEW.categoria IS DISTINCT FROM OLD.categoria THEN
    NEW.categoria_terapeutica := NEW.categoria;
  END IF;
  IF TG_OP = 'INSERT' OR NEW.afinidad IS DISTINCT FROM OLD.afinidad THEN
    NEW.tratamiento := NEW.afinidad;
  END IF;
  IF TG_OP = 'INSERT' OR NEW.tipo_afinidad IS DISTINCT FROM OLD.tipo_afinidad THEN
    NEW.tipo_tratamiento := NEW.tipo_afinidad;
  END IF;
  IF TG_OP = 'INSERT' OR NEW.es_ancla IS DISTINCT FROM OLD.es_ancla THEN
    NEW.es_cronico := NEW.es_ancla;
  END IF;
  IF TG_OP = 'INSERT' OR NEW.requiere_autorizacion IS DISTINCT FROM OLD.requiere_autorizacion THEN
    NEW.es_receta := NEW.requiere_autorizacion;
  END IF;
  IF TG_OP = 'INSERT' OR NEW.atributo_clave IS DISTINCT FROM OLD.atributo_clave THEN
    NEW.principio_activo := NEW.atributo_clave;
  END IF;
  IF TG_OP = 'INSERT' OR NEW.codigo_externo IS DISTINCT FROM OLD.codigo_externo THEN
    NEW.categoria_atc := NEW.codigo_externo;
  END IF;

  -- v3 → v4 (el código legado escribió las farmacéuticas)
  IF TG_OP = 'UPDATE' THEN
    IF NEW.categoria_terapeutica IS DISTINCT FROM OLD.categoria_terapeutica
       AND NEW.categoria IS NOT DISTINCT FROM OLD.categoria THEN
      NEW.categoria := NEW.categoria_terapeutica;
    END IF;
    IF NEW.tratamiento IS DISTINCT FROM OLD.tratamiento
       AND NEW.afinidad IS NOT DISTINCT FROM OLD.afinidad THEN
      NEW.afinidad := NEW.tratamiento;
    END IF;
    IF NEW.tipo_tratamiento IS DISTINCT FROM OLD.tipo_tratamiento
       AND NEW.tipo_afinidad IS NOT DISTINCT FROM OLD.tipo_afinidad THEN
      NEW.tipo_afinidad := NEW.tipo_tratamiento;
    END IF;
    IF NEW.es_cronico IS DISTINCT FROM OLD.es_cronico
       AND NEW.es_ancla IS NOT DISTINCT FROM OLD.es_ancla THEN
      NEW.es_ancla := NEW.es_cronico;
    END IF;
    IF NEW.es_receta IS DISTINCT FROM OLD.es_receta
       AND NEW.requiere_autorizacion IS NOT DISTINCT FROM OLD.requiere_autorizacion THEN
      NEW.requiere_autorizacion := NEW.es_receta;
    END IF;
    IF NEW.principio_activo IS DISTINCT FROM OLD.principio_activo
       AND NEW.atributo_clave IS NOT DISTINCT FROM OLD.atributo_clave THEN
      NEW.atributo_clave := NEW.principio_activo;
    END IF;
    IF NEW.categoria_atc IS DISTINCT FROM OLD.categoria_atc
       AND NEW.codigo_externo IS NOT DISTINCT FROM OLD.codigo_externo THEN
      NEW.codigo_externo := NEW.categoria_atc;
    END IF;
  END IF;

  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS productos_master_sync_ontologia ON productos_master;
CREATE TRIGGER productos_master_sync_ontologia
  BEFORE INSERT OR UPDATE ON productos_master
  FOR EACH ROW EXECUTE FUNCTION sync_ontologia_v3_v4();

-- ── 3. Vertical Packs ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vertical_packs (
  id                  TEXT PRIMARY KEY,              -- '000' | '001' | '002' ...
  nombre              TEXT NOT NULL,
  version             TEXT NOT NULL DEFAULT '1.0.0',
  -- Nivel de evidencia de los priors (PRD §9.2). Propiedad declarada,
  -- no inferida del id: el Core pregunta por respaldo, no por identidad.
  tier_prior          TEXT NOT NULL DEFAULT 'T2' CHECK (tier_prior IN ('T1','T2')),
  ontologia           JSONB NOT NULL,                -- labels y semántica de los 3 niveles
  clasificador_prompt TEXT NOT NULL,
  clasificador_schema JSONB,                         -- schema JSON forzado para el LLM
  recompra            JSONB NOT NULL,                -- min_compras, cv_max, ciclo_max_dias, ventana_preventiva_dias
  churn               JSONB NOT NULL,                -- dias_inactividad_total, dias_riesgo, umbral_downgrade_pct, items_ancla
  conversion_prior    JSONB NOT NULL,                -- tasas T2 del vertical (PRD §9)
  ticket_referencia   JSONB NOT NULL,                -- fallback de ticket cuando falta historial
  scoring             JSONB NOT NULL,                -- pesos del scoring de promociones
  modulos             JSONB NOT NULL DEFAULT '{}'::jsonb,
  captura_visual      JSONB NOT NULL DEFAULT '{}'::jsonb,
  agente              JSONB NOT NULL DEFAULT '{}'::jsonb,
  labels              JSONB NOT NULL DEFAULT '{}'::jsonb,
  activo              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE vertical_packs IS
  'Configuración por vertical (PRD v4.0 §3.2). El Core es agnóstico al sector: '
  'ningún módulo puede contener un if (vertical === X) — si hace falta, es que falta un parámetro aquí.';

-- Cada tenant apunta a un pack. Default '001' preserva el comportamiento
-- del tenant de farmacia existente.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS pack_id TEXT NOT NULL DEFAULT '001';

-- ── 4. Overrides de conversión por tenant (PRD §9.3) ─────────
-- El dueño puede sobrescribir una tasa manualmente; queda marcada
-- en UI como "Ajustada por ti".
CREATE TABLE IF NOT EXISTS conversion_overrides (
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  accion        TEXT NOT NULL,                       -- recuperacion_ancla | reactivacion_total | ...
  tasa          NUMERIC(4,3) NOT NULL CHECK (tasa >= 0 AND tasa <= 1),
  set_by        TEXT,
  set_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, accion)
);

-- ── 5. Vista de compatibilidad v3 ────────────────────────────
-- Expone los nombres antiguos sobre las columnas genéricas. Durante
-- la convivencia es redundante (las columnas legado siguen ahí), pero
-- permite migrar el código a la vista antes de que 004 borre las
-- columnas: al eliminarlas, la vista sigue sirviendo los mismos
-- nombres y nada se rompe.
CREATE OR REPLACE VIEW productos_master_v3 AS
SELECT
  codigo,
  nombre_normalizado,
  atributo_clave        AS principio_activo,
  codigo_externo        AS categoria_atc,
  categoria             AS categoria_terapeutica,
  subcategoria,
  tipo_afinidad         AS tipo_tratamiento,
  afinidad              AS tratamiento,
  es_ancla              AS es_cronico,
  requiere_autorizacion AS es_receta,
  classification_source,
  classified_at,
  pack_id,
  created_at,
  updated_at
FROM productos_master;

COMMENT ON VIEW productos_master_v3 IS
  'TEMPORAL — compatibilidad con nombres de columna v3 (farmacia). '
  'Eliminar al completar la Fase B del PRD v4.0. No usar en código nuevo.';

-- INSTEAD OF triggers: la vista debe aceptar escrituras porque
-- classification/process/route.ts hace INSERT ... ON CONFLICT UPDATE.
CREATE OR REPLACE FUNCTION productos_master_v3_insert() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO productos_master (
    codigo, nombre_normalizado, atributo_clave, codigo_externo,
    categoria, subcategoria, tipo_afinidad, afinidad,
    es_ancla, requiere_autorizacion, classification_source, classified_at, pack_id
  ) VALUES (
    NEW.codigo, NEW.nombre_normalizado, NEW.principio_activo, NEW.categoria_atc,
    NEW.categoria_terapeutica, NEW.subcategoria, NEW.tipo_tratamiento, NEW.tratamiento,
    COALESCE(NEW.es_cronico, false), COALESCE(NEW.es_receta, false),
    NEW.classification_source, NEW.classified_at, COALESCE(NEW.pack_id, '001')
  )
  ON CONFLICT (codigo) DO UPDATE SET
    nombre_normalizado    = EXCLUDED.nombre_normalizado,
    atributo_clave        = EXCLUDED.atributo_clave,
    codigo_externo        = EXCLUDED.codigo_externo,
    categoria             = EXCLUDED.categoria,
    subcategoria          = EXCLUDED.subcategoria,
    tipo_afinidad         = EXCLUDED.tipo_afinidad,
    afinidad              = EXCLUDED.afinidad,
    es_ancla              = EXCLUDED.es_ancla,
    requiere_autorizacion = EXCLUDED.requiere_autorizacion,
    classification_source = EXCLUDED.classification_source,
    classified_at         = EXCLUDED.classified_at,
    updated_at            = now();
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION productos_master_v3_update() RETURNS TRIGGER AS $$
BEGIN
  UPDATE productos_master SET
    nombre_normalizado    = NEW.nombre_normalizado,
    atributo_clave        = NEW.principio_activo,
    codigo_externo        = NEW.categoria_atc,
    categoria             = NEW.categoria_terapeutica,
    subcategoria          = NEW.subcategoria,
    tipo_afinidad         = NEW.tipo_tratamiento,
    afinidad              = NEW.tratamiento,
    es_ancla              = COALESCE(NEW.es_cronico, false),
    requiere_autorizacion = COALESCE(NEW.es_receta, false),
    classification_source = NEW.classification_source,
    classified_at         = NEW.classified_at,
    updated_at            = now()
  WHERE codigo = OLD.codigo;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS productos_master_v3_insert_trg ON productos_master_v3;
CREATE TRIGGER productos_master_v3_insert_trg
  INSTEAD OF INSERT ON productos_master_v3
  FOR EACH ROW EXECUTE FUNCTION productos_master_v3_insert();

DROP TRIGGER IF EXISTS productos_master_v3_update_trg ON productos_master_v3;
CREATE TRIGGER productos_master_v3_update_trg
  INSTEAD OF UPDATE ON productos_master_v3
  FOR EACH ROW EXECUTE FUNCTION productos_master_v3_update();

-- ── 6. updated_at automático en vertical_packs ───────────────
DROP TRIGGER IF EXISTS vertical_packs_set_updated_at ON vertical_packs;
CREATE TRIGGER vertical_packs_set_updated_at
  BEFORE UPDATE ON vertical_packs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
