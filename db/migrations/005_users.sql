-- =============================================================
-- Sellix AI — Migración 005: Usuarios y roles (PRD v4.0, Fase A′)
--
-- Hoy la autenticación compara contra APP_USER / APP_PASSWORD (variables
-- de entorno globales) y el rol se guarda en localStorage del navegador.
-- Eso significa que cualquiera puede escribir `sellix-role = nextaitech`
-- en la consola y entrar al panel de comisiones cross-tenant.
--
-- Esta migración mueve usuarios, tenant y rol a la base de datos, para
-- que el rol viaje firmado en el JWT y el servidor pueda validarlo.
--
-- El seed del admin actual NO va aquí: la contraseña no debe quedar
-- escrita en un archivo versionado. Se crea con scripts/seed-admin.mjs,
-- que lee APP_USER / APP_PASSWORD del entorno y guarda un hash bcrypt.
--
-- Idempotente.
-- =============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  tenant_id      TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  username       TEXT NOT NULL,
  password_hash  TEXT NOT NULL,               -- bcrypt, nunca texto plano
  nombre         TEXT,
  email          TEXT,
  rol            TEXT NOT NULL DEFAULT 'agente'
                 CHECK (rol IN ('owner','admin','agente','analista','nextaitech')),
  activo         BOOLEAN NOT NULL DEFAULT true,
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- El username es único por tenant, no globalmente: dos negocios distintos
-- pueden tener cada uno su usuario "admin".
CREATE UNIQUE INDEX IF NOT EXISTS users_tenant_username_idx
  ON users(tenant_id, lower(username));

CREATE INDEX IF NOT EXISTS users_tenant_idx ON users(tenant_id) WHERE activo;

COMMENT ON TABLE users IS
  'Usuarios por tenant (PRD v4.0 §7.3). El rol se lee SIEMPRE de aquí vía el claim '
  'del JWT, nunca de localStorage ni de un parámetro de request.';

COMMENT ON COLUMN users.rol IS
  'owner: todo el tenant + facturación · admin: módulos operativos · '
  'agente: inbox y clientes · analista: solo lectura · '
  'nextaitech: cross-tenant (comisiones y salud de plataforma).';

COMMENT ON COLUMN users.tenant_id IS
  'Tenant al que pertenece. Para el rol nextaitech es su tenant de origen; '
  'su alcance cross-tenant se concede por rol, no por esta columna.';

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
