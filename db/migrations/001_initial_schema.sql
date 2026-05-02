-- =============================================================
-- Sellix AI — Initial schema
-- Multi-tenant Postgres schema. Every operational table carries
-- tenant_id so isolation is enforced at query time.
-- =============================================================

-- ── Tenants ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id            TEXT PRIMARY KEY,
  nombre        TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  config        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Productos master (catálogo global compartido entre tenants) ──
-- Una vez clasificado un código por Gemini, todos los tenants lo aprovechan.
CREATE TABLE IF NOT EXISTS productos_master (
  codigo                  TEXT PRIMARY KEY,
  nombre_normalizado      TEXT NOT NULL,
  principio_activo        TEXT,
  categoria_atc           TEXT,
  categoria_terapeutica   TEXT,
  subcategoria            TEXT,
  tipo_tratamiento        TEXT,  -- cronico|agudo|ocasional|preventivo|no_aplica
  tratamiento             TEXT,
  es_cronico              BOOLEAN DEFAULT false,
  es_receta               BOOLEAN DEFAULT false,
  classification_source   TEXT,  -- 'gemini' | 'manual' | 'fuzzy_match'
  classified_at           TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS productos_master_nombre_idx ON productos_master USING gin (to_tsvector('spanish', nombre_normalizado));
CREATE INDEX IF NOT EXISTS productos_master_categoria_idx ON productos_master(categoria_terapeutica);
CREATE INDEX IF NOT EXISTS productos_master_tratamiento_idx ON productos_master(tratamiento);

-- ── Productos por tenant (precios, stock, presentación específica) ──
CREATE TABLE IF NOT EXISTS productos_tenant (
  tenant_id        TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  codigo           TEXT NOT NULL,
  nombre           TEXT NOT NULL,                    -- nombre como aparece en el Excel del tenant
  precio_unidad    NUMERIC(12,2),
  precio_caja      NUMERIC(12,2),
  unidades_caja    INTEGER,
  stock            INTEGER,
  activo           BOOLEAN DEFAULT true,
  metadata         JSONB DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, codigo)
);
CREATE INDEX IF NOT EXISTS productos_tenant_nombre_idx ON productos_tenant USING gin (to_tsvector('spanish', nombre));

-- ── Uploads (manifest de archivos Excel cargados) ────────────
CREATE TABLE IF NOT EXISTS uploads (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,
  file_type     TEXT NOT NULL,                       -- 'ventas' | 'remisiones' | 'productos'
  row_count     INTEGER NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT true,
  uploaded_by   TEXT,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at  TIMESTAMPTZ,
  metadata      JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS uploads_tenant_idx ON uploads(tenant_id, active);

-- ── Clientes (perfil base) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
  tenant_id      TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cedula         TEXT NOT NULL,
  nombre         TEXT,
  telefono       TEXT,
  email          TEXT,
  primera_compra DATE,
  ultima_compra  DATE,
  metadata       JSONB DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, cedula)
);
CREATE INDEX IF NOT EXISTS clientes_telefono_idx ON clientes(tenant_id, telefono);
CREATE INDEX IF NOT EXISTS clientes_ultima_compra_idx ON clientes(tenant_id, ultima_compra);

-- ── Ventas (transacciones crudas del Excel) ──────────────────
CREATE TABLE IF NOT EXISTS ventas (
  id            BIGSERIAL PRIMARY KEY,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  upload_id     TEXT REFERENCES uploads(id) ON DELETE SET NULL,
  cedula        TEXT NOT NULL,
  fecha         TIMESTAMPTZ NOT NULL,
  codigo        TEXT NOT NULL,
  producto      TEXT NOT NULL,
  cantidad      NUMERIC(12,2) NOT NULL,
  total         NUMERIC(14,2) NOT NULL,
  sesion        TEXT,                                 -- agrupador por ticket
  raw           JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ventas_tenant_cedula_idx ON ventas(tenant_id, cedula);
CREATE INDEX IF NOT EXISTS ventas_tenant_codigo_idx ON ventas(tenant_id, codigo);
CREATE INDEX IF NOT EXISTS ventas_tenant_fecha_idx ON ventas(tenant_id, fecha);
CREATE INDEX IF NOT EXISTS ventas_tenant_sesion_idx ON ventas(tenant_id, sesion);
CREATE INDEX IF NOT EXISTS ventas_upload_idx ON ventas(upload_id);

-- ── Cola de clasificación (productos pendientes de clasificar por Gemini) ──
CREATE TABLE IF NOT EXISTS classification_queue (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  codigo          TEXT NOT NULL,
  nombre          TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',    -- pending|processing|done|failed
  attempts        INTEGER NOT NULL DEFAULT 0,
  error           TEXT,
  enqueued_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS classification_queue_status_idx ON classification_queue(status, enqueued_at);

-- ── Campañas y atribución ───────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,                        -- churn|reposicion|promotion|nba
  channel       TEXT NOT NULL,                        -- email|whatsapp|ambos
  template_id   TEXT,
  subject       TEXT,
  body          TEXT,
  status        TEXT NOT NULL DEFAULT 'draft',        -- draft|sent|partial|failed
  sent_count    INTEGER NOT NULL DEFAULT 0,
  error_count   INTEGER NOT NULL DEFAULT 0,
  metadata      JSONB DEFAULT '{}'::jsonb,
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS campaigns_tenant_idx ON campaigns(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS message_log (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_id   TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
  cedula        TEXT NOT NULL,
  nombre        TEXT,
  campaign_type TEXT NOT NULL,
  channel       TEXT NOT NULL,
  template_id   TEXT,
  producto      TEXT,
  delivered     BOOLEAN DEFAULT true,
  error         TEXT,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS message_log_tenant_cedula_idx ON message_log(tenant_id, cedula, sent_at);

CREATE TABLE IF NOT EXISTS attributions (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  message_id      TEXT NOT NULL REFERENCES message_log(id) ON DELETE CASCADE,
  cedula          TEXT NOT NULL,
  fecha_mensaje   TIMESTAMPTZ NOT NULL,
  fecha_compra    TIMESTAMPTZ NOT NULL,
  dias_despues    INTEGER NOT NULL,
  valor_venta     NUMERIC(14,2) NOT NULL,
  producto        TEXT,
  match_exacto    BOOLEAN NOT NULL DEFAULT false,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS attributions_tenant_idx ON attributions(tenant_id, fecha_mensaje DESC);

-- ── Acciones preparadas (Next Best Action "ejecución asistida") ──
-- Aquí guardamos las acciones precalculadas: cliente, mensaje sugerido,
-- canal, oferta, ETA de impacto. El manager solo aprueba.
CREATE TABLE IF NOT EXISTS prepared_actions (
  id                TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category          TEXT NOT NULL,                    -- churn|reposicion|vip|venta_cruzada|gancho
  priority          TEXT NOT NULL,                    -- critica|alta|media|baja
  title             TEXT NOT NULL,
  description       TEXT,
  recipients        JSONB NOT NULL,                   -- array de { cedula, nombre, telefono, contactable, score, razones }
  suggested_message TEXT,
  channel           TEXT,
  offer             JSONB,                            -- { tipo, descuento_pct, productos }
  ingreso_estimado  NUMERIC(14,2),
  ingreso_realista  NUMERIC(14,2),
  status            TEXT NOT NULL DEFAULT 'ready',    -- ready|approved|rejected|executed|expired
  approved_by       TEXT,
  approved_at       TIMESTAMPTZ,
  executed_at       TIMESTAMPTZ,
  campaign_id       TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
  expires_at        TIMESTAMPTZ,
  computed_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prepared_actions_tenant_status_idx ON prepared_actions(tenant_id, status, computed_at DESC);

-- ── Conversaciones WhatsApp (CRM) ────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id                TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cliente_cedula    TEXT,
  cliente_nombre    TEXT,
  cliente_telefono  TEXT NOT NULL,
  stage             TEXT NOT NULL DEFAULT 'lead',
  status            TEXT NOT NULL DEFAULT 'no_respondido',
  priority          TEXT DEFAULT 'media',
  tags              TEXT[] DEFAULT ARRAY[]::TEXT[],
  notes             TEXT,
  assigned_to       TEXT,
  unread            INTEGER NOT NULL DEFAULT 0,
  last_message_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conversations_tenant_idx ON conversations(tenant_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS conversations_telefono_idx ON conversations(tenant_id, cliente_telefono);

CREATE TABLE IF NOT EXISTS chat_messages (
  id                TEXT PRIMARY KEY,
  conversation_id   TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  tenant_id         TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_role         TEXT NOT NULL,                    -- cliente|agente|sistema|ai
  text              TEXT NOT NULL,
  type              TEXT NOT NULL DEFAULT 'text',     -- text|image|payment_link|auto_followup
  metadata          JSONB DEFAULT '{}'::jsonb,
  timestamp         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_messages_conv_idx ON chat_messages(conversation_id, timestamp);

CREATE TABLE IF NOT EXISTS orders (
  id                TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id   TEXT REFERENCES conversations(id) ON DELETE SET NULL,
  items             JSONB NOT NULL DEFAULT '[]'::jsonb,
  total             NUMERIC(14,2) NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'borrador',
  payment           JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_tenant_idx ON orders(tenant_id, created_at DESC);

-- ── Perfil dinámico del cliente (alimentado por conversaciones IA) ──
-- El "Vendedor IA" actualiza esto con cada conversación: sensibilidad
-- a precio, intent score, productos preferidos, etc.
CREATE TABLE IF NOT EXISTS perfil_cliente_dinamico (
  tenant_id              TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cedula                 TEXT NOT NULL,
  price_sensitivity      NUMERIC(4,2),                -- 0.00 (insensible) - 1.00 (muy sensible)
  intent_score           NUMERIC(4,2),                -- probabilidad de cierre en conversación activa
  freq_real_dias         NUMERIC(8,2),                -- frecuencia observada en chats vs ventas
  productos_intereses    JSONB DEFAULT '[]'::jsonb,   -- productos consultados en conversaciones
  marcas_preferidas      JSONB DEFAULT '[]'::jsonb,
  rechaza_cross_sell     BOOLEAN DEFAULT false,
  responde_urgencia      BOOLEAN,
  ultima_conversacion    TIMESTAMPTZ,
  num_conversaciones     INTEGER NOT NULL DEFAULT 0,
  insights               JSONB DEFAULT '{}'::jsonb,   -- bag of unstructured signals
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, cedula)
);

-- ── Audit log (quién aprobó qué, cuándo) ────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       TEXT REFERENCES tenants(id) ON DELETE SET NULL,
  actor           TEXT,                               -- userId o 'system'
  action          TEXT NOT NULL,                      -- 'campaign.send', 'action.approve', etc.
  entity_type     TEXT,
  entity_id       TEXT,
  payload         JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_log_tenant_idx ON audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_action_idx ON audit_log(action, created_at DESC);

-- ── Trigger: updated_at automático ───────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'tenants','productos_master','productos_tenant','clientes',
    'conversations','orders','perfil_cliente_dinamico'
  ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I_set_updated_at ON %I; ' ||
      'CREATE TRIGGER %I_set_updated_at BEFORE UPDATE ON %I ' ||
      'FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      t, t, t, t
    );
  END LOOP;
END $$;
