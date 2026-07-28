-- =============================================================
-- Sellix AI — Migración 003: Seed de Vertical Packs (PRD v4.0, Fase B tarea 11)
--
-- Pack 001 (Farmacia) reproduce EXACTAMENTE el comportamiento de v3.
-- Todo valor aquí está copiado de su constante original:
--   conversion_prior   ← CONVERSION en src/app/api/actions/route.ts:17-41
--   ticket_referencia  ← DEFAULT_PHARMACY_TICKET / DEFAULT_REPO_TICKET  (:43-44)
--   scoring            ← SCORE en src/app/api/promotions/match/route.ts:26-39
--   recompra           ← filtros de etl.ts (3 compras, CV ≤ 0.6, ciclo ≤ 120d)
--   clasificador_prompt← src/app/api/classification/process/route.ts:159
--
-- CRITERIO DE SALIDA DE LA FASE B: con el Pack 001 cargado, el tenant
-- `superofertas` debe producir resultados idénticos a los actuales.
-- Si no los produce, la abstracción está mal — no se avanza.
--
-- Pack 000 (Genérico) usa priors conservadores: ante la falta de
-- evidencia sectorial, subestimar es preferible a inflar proyecciones
-- que el dueño usará para comprar inventario.
--
-- Idempotente: ON CONFLICT DO UPDATE.
-- =============================================================

BEGIN;

-- ── Pack 000 — Genérico ──────────────────────────────────────
INSERT INTO vertical_packs (
  id, nombre, version, tier_prior, ontologia, clasificador_prompt,
  recompra, churn, conversion_prior, ticket_referencia, scoring,
  modulos, captura_visual, agente, labels
) VALUES (
  '000',
  'Genérico',
  '1.0.0',
  'T1',   -- sin evidencia sectorial: la UI muestra "Estimación general"
  '{
    "nivel_1": {"clave": "categoria",    "label": "Categoría",    "ejemplo": "Categoría del producto"},
    "nivel_2": {"clave": "subcategoria", "label": "Subcategoría", "ejemplo": "Línea o subfamilia"},
    "nivel_3": {"clave": "afinidad",     "label": "Grupo",        "ejemplo": "Necesidad que resuelve"}
  }'::jsonb,
  'Clasifica estos productos de un comercio minorista. Para cada uno determina: categoría (nivel general), subcategoría (línea específica), y grupo de afinidad (la necesidad o propósito compartido por el que un cliente compraría varios de estos productos en secuencia). Marca es_ancla=true si el abandono del producto indicaría que el cliente dejó de comprar en el negocio. Responde SOLO JSON según el schema.',
  -- Recompra conservadora: ventana amplia porque no conocemos el ciclo del sector.
  '{"min_compras": 3, "cv_max": 0.6, "ciclo_max_dias": 180, "ventana_preventiva_dias": 7}'::jsonb,
  '{"dias_inactividad_total": 180, "dias_riesgo": 60, "umbral_downgrade_pct": 30, "items_ancla": []}'::jsonb,
  -- Priors conservadores (~60% de los de farmacia): sin evidencia del
  -- sector, es preferible subestimar el ingreso proyectado.
  '{
    "recuperacion_ancla": 0.20,
    "reactivacion_total": 0.08,
    "vip_inactivo": 0.15,
    "recompra_vencida": 0.30,
    "recompra_preventiva": 0.40,
    "downgrade_liftback": 0.25,
    "lealtad": 0.12,
    "lealtad_ciclos_extra": 2
  }'::jsonb,
  -- Sin historial no hay ticket confiable; estos valores solo aplican
  -- como último recurso y la UI los marca como "Estimación general".
  '{"general": 40000, "recompra": 30000}'::jsonb,
  '{
    "EXACT_PRODUCT_BASE": 50,
    "EXACT_PRODUCT_PER_REPEAT": 5,
    "EXACT_PRODUCT_REPEAT_CAP": 25,
    "PENDING_REPLENISHMENT": 30,
    "CATEGORY_BASE": 20,
    "CATEGORY_PER_TIME": 2,
    "CATEGORY_TIME_CAP": 15,
    "AFFINITY_BASE": 5,
    "AFFINITY_TIME_CAP": 10,
    "RECURRENT_BONUS": 15,
    "COOCCURRENCE_BONUS": 15,
    "PROMO_SENSITIVITY_BONUS": 10,
    "INACTIVE_PENALTY": -10,
    "TICKET_OUT_OF_RANGE_PENALTY": -15,
    "TICKET_OUT_OF_RANGE_FACTOR": 3,
    "MIN_INCLUSION": 11,
    "MIN_FUZZY_MATCH_LEN": 5
  }'::jsonb,
  '{"recompra": true, "captura_visual": true, "comparador_competencia": true, "postventa_durables": false}'::jsonb,
  '{"modos": ["lista_compras", "foto_producto"], "prompt": "Identifica los productos visibles en la imagen y devuelve una lista de ítems con cantidad."}'::jsonb,
  '{"competidores_referencia": [], "restricciones_tono": ["No prometer plazos de entrega no confirmados", "No dar asesoría profesional fuera del ámbito comercial"]}'::jsonb,
  '{"recompra": "Próxima compra", "afinidad": "Grupo"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre, version = EXCLUDED.version,
  tier_prior = EXCLUDED.tier_prior,
  ontologia = EXCLUDED.ontologia, clasificador_prompt = EXCLUDED.clasificador_prompt,
  recompra = EXCLUDED.recompra, churn = EXCLUDED.churn,
  conversion_prior = EXCLUDED.conversion_prior, ticket_referencia = EXCLUDED.ticket_referencia,
  scoring = EXCLUDED.scoring, modulos = EXCLUDED.modulos,
  captura_visual = EXCLUDED.captura_visual, agente = EXCLUDED.agente, labels = EXCLUDED.labels;

-- ── Pack 001 — Farmacia / Droguería ──────────────────────────
-- PRESERVACIÓN EXACTA DEL v3.0. No cambiar estos valores sin
-- validar contra el comportamiento en producción de `superofertas`.
INSERT INTO vertical_packs (
  id, nombre, version, tier_prior, ontologia, clasificador_prompt,
  recompra, churn, conversion_prior, ticket_referencia, scoring,
  modulos, captura_visual, agente, labels
) VALUES (
  '001',
  'Farmacia / Droguería',
  '1.0.0',
  'T2',   -- priors respaldados por benchmarks del sector farmacéutico
  '{
    "nivel_1": {"clave": "categoria",    "label": "Categoría terapéutica", "ejemplo": "Cardiovascular"},
    "nivel_2": {"clave": "subcategoria", "label": "Grupo farmacológico",   "ejemplo": "Antihipertensivos"},
    "nivel_3": {"clave": "afinidad",     "label": "Tratamiento",           "ejemplo": "Hipertensión arterial"}
  }'::jsonb,
  -- Copiado de classification/process/route.ts:159
  'Clasifica estos productos farmacéuticos colombianos. Responde SOLO JSON según el schema.',
  -- Copiado de los filtros de etl.ts
  '{"min_compras": 3, "cv_max": 0.6, "ciclo_max_dias": 120, "ventana_preventiva_dias": 7}'::jsonb,
  '{"dias_inactividad_total": 180, "dias_riesgo": 45, "umbral_downgrade_pct": 30, "items_ancla": ["cronico"]}'::jsonb,
  -- Copiado literal de CONVERSION en actions/route.ts:17-41
  '{
    "recuperacion_ancla": 0.35,
    "recuperacion_ancla_compras_futuras": 2,
    "reactivacion_total": 0.15,
    "vip_inactivo": 0.25,
    "recompra_vencida": 0.55,
    "recompra_preventiva": 0.70,
    "downgrade_liftback": 0.40,
    "lealtad": 0.20,
    "lealtad_ciclos_extra": 3
  }'::jsonb,
  -- DEFAULT_PHARMACY_TICKET = 85000, DEFAULT_REPO_TICKET = 55000
  '{"general": 85000, "recompra": 55000}'::jsonb,
  -- Copiado literal de SCORE en promotions/match/route.ts:26-39.
  -- Las 3 señales nuevas del PRD §6.3.1 se incluyen en 0 para que el
  -- Pack 001 reproduzca v3 byte a byte; se activan en Fase D.
  '{
    "EXACT_PRODUCT_BASE": 50,
    "EXACT_PRODUCT_PER_REPEAT": 5,
    "EXACT_PRODUCT_REPEAT_CAP": 25,
    "PENDING_REPLENISHMENT": 30,
    "CATEGORY_BASE": 20,
    "CATEGORY_PER_TIME": 2,
    "CATEGORY_TIME_CAP": 15,
    "AFFINITY_BASE": 5,
    "AFFINITY_TIME_CAP": 10,
    "RECURRENT_BONUS": 15,
    "COOCCURRENCE_BONUS": 0,
    "PROMO_SENSITIVITY_BONUS": 0,
    "INACTIVE_PENALTY": -10,
    "TICKET_OUT_OF_RANGE_PENALTY": 0,
    "TICKET_OUT_OF_RANGE_FACTOR": 3,
    "MIN_INCLUSION": 11,
    "MIN_FUZZY_MATCH_LEN": 5
  }'::jsonb,
  '{"recompra": true, "captura_visual": true, "comparador_competencia": true, "postventa_durables": false}'::jsonb,
  '{"modos": ["receta", "lista_compras", "foto_producto"], "prompt": "Analiza esta receta médica. Extrae cada medicamento con su nombre, dosis, presentación y cantidad."}'::jsonb,
  '{
    "competidores_referencia": ["Cruz Verde", "Farmatodo", "La Rebaja", "Olímpica"],
    "restricciones_tono": [
      "Nunca dar diagnóstico ni recomendación médica",
      "Derivar cualquier consulta de salud al profesional",
      "No sugerir cambio de medicamento formulado"
    ]
  }'::jsonb,
  '{"recompra": "Reposición", "afinidad": "Tratamiento", "categoria": "Categoría terapéutica"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre, version = EXCLUDED.version,
  tier_prior = EXCLUDED.tier_prior,
  ontologia = EXCLUDED.ontologia, clasificador_prompt = EXCLUDED.clasificador_prompt,
  recompra = EXCLUDED.recompra, churn = EXCLUDED.churn,
  conversion_prior = EXCLUDED.conversion_prior, ticket_referencia = EXCLUDED.ticket_referencia,
  scoring = EXCLUDED.scoring, modulos = EXCLUDED.modulos,
  captura_visual = EXCLUDED.captura_visual, agente = EXCLUDED.agente, labels = EXCLUDED.labels;

-- ── Pack 002 — Pet Shop / Veterinaria ────────────────────────
-- Segundo vertical: prueba de horizontalidad (PRD §11 Fase E, tarea 30).
INSERT INTO vertical_packs (
  id, nombre, version, tier_prior, ontologia, clasificador_prompt,
  recompra, churn, conversion_prior, ticket_referencia, scoring,
  modulos, captura_visual, agente, labels
) VALUES (
  '002',
  'Pet Shop / Veterinaria',
  '1.0.0',
  'T2',   -- priors del vertical; se recalibran a T3 con atribución real
  '{
    "nivel_1": {"clave": "categoria",    "label": "Categoría", "ejemplo": "Alimento seco"},
    "nivel_2": {"clave": "subcategoria", "label": "Línea",     "ejemplo": "Perro adulto raza grande"},
    "nivel_3": {"clave": "afinidad",     "label": "Necesidad", "ejemplo": "Control de peso"}
  }'::jsonb,
  'Clasifica estos productos de un pet shop colombiano. Para cada uno determina: categoría (alimento seco, alimento húmedo, snacks, higiene, accesorios, medicamento veterinario, juguetes), línea (especie, etapa de vida y tamaño), y necesidad (el propósito por el que el dueño lo compra: control de peso, piel sensible, cachorro, higiene dental). Marca es_ancla=true para alimento: su abandono indica pérdida del cliente. Responde SOLO JSON según el schema.',
  -- Ciclo más corto y estable que farmacia: el alimento se agota en fecha predecible.
  '{"min_compras": 3, "cv_max": 0.55, "ciclo_max_dias": 90, "ventana_preventiva_dias": 7}'::jsonb,
  '{"dias_inactividad_total": 120, "dias_riesgo": 45, "umbral_downgrade_pct": 30, "items_ancla": ["alimento"]}'::jsonb,
  '{
    "recuperacion_ancla": 0.30,
    "reactivacion_total": 0.12,
    "vip_inactivo": 0.22,
    "recompra_vencida": 0.50,
    "recompra_preventiva": 0.65,
    "downgrade_liftback": 0.35,
    "lealtad": 0.18,
    "lealtad_ciclos_extra": 3
  }'::jsonb,
  '{"general": 45000, "recompra": 38000}'::jsonb,
  '{
    "EXACT_PRODUCT_BASE": 50,
    "EXACT_PRODUCT_PER_REPEAT": 5,
    "EXACT_PRODUCT_REPEAT_CAP": 25,
    "PENDING_REPLENISHMENT": 30,
    "CATEGORY_BASE": 20,
    "CATEGORY_PER_TIME": 2,
    "CATEGORY_TIME_CAP": 15,
    "AFFINITY_BASE": 5,
    "AFFINITY_TIME_CAP": 10,
    "RECURRENT_BONUS": 15,
    "COOCCURRENCE_BONUS": 15,
    "PROMO_SENSITIVITY_BONUS": 10,
    "INACTIVE_PENALTY": -10,
    "TICKET_OUT_OF_RANGE_PENALTY": -15,
    "TICKET_OUT_OF_RANGE_FACTOR": 3,
    "MIN_INCLUSION": 11,
    "MIN_FUZZY_MATCH_LEN": 5
  }'::jsonb,
  '{"recompra": true, "captura_visual": true, "comparador_competencia": true, "postventa_durables": false}'::jsonb,
  '{"modos": ["lista_compras", "foto_producto", "etiqueta_empaque"], "prompt": "Identifica los productos de alimento y accesorios para mascotas visibles en la imagen, con marca y presentación."}'::jsonb,
  '{
    "competidores_referencia": ["Agrocampo", "Kanu", "Laika"],
    "restricciones_tono": [
      "No dar diagnóstico veterinario",
      "Derivar cualquier tema de salud animal al profesional"
    ]
  }'::jsonb,
  '{"recompra": "Próxima ración", "afinidad": "Necesidad"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre, version = EXCLUDED.version,
  tier_prior = EXCLUDED.tier_prior,
  ontologia = EXCLUDED.ontologia, clasificador_prompt = EXCLUDED.clasificador_prompt,
  recompra = EXCLUDED.recompra, churn = EXCLUDED.churn,
  conversion_prior = EXCLUDED.conversion_prior, ticket_referencia = EXCLUDED.ticket_referencia,
  scoring = EXCLUDED.scoring, modulos = EXCLUDED.modulos,
  captura_visual = EXCLUDED.captura_visual, agente = EXCLUDED.agente, labels = EXCLUDED.labels;

-- ── Asignación del tenant existente ──────────────────────────
-- Droguería Super Ofertas queda en el Pack 001 (comportamiento actual).
UPDATE tenants SET pack_id = '001' WHERE pack_id IS NULL OR pack_id = '';

-- La FK se añade aquí y no en 002 porque requiere que los packs ya
-- existan: el DEFAULT '001' de tenants.pack_id la violaría de otro modo.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tenants_pack_id_fkey'
  ) THEN
    ALTER TABLE tenants
      ADD CONSTRAINT tenants_pack_id_fkey
      FOREIGN KEY (pack_id) REFERENCES vertical_packs(id);
  END IF;
END $$;

COMMIT;
