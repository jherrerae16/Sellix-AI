-- =============================================================
-- Sellix AI — Migración 006: Row Level Security (PRD v4.0, Fase A′)
--
-- ESTADO: las queries de la aplicación ya declaran su tenant vía
-- `withTenant` / `withBypassRls` (src/lib/db.ts), así que esta migración
-- puede aplicarse sin dejar la aplicación sin datos.
--
-- ⚠️  APLICARLA NO BASTA PARA QUE EL AISLAMIENTO SEA REAL. Ver abajo:
-- mientras DATABASE_URL apunte a un rol con rolbypassrls, las políticas
-- existen pero no se evalúan. El interruptor final es cambiar ese rol.
--
-- Verificación reproducible del aislamiento:  node scripts/test-rls.mjs
--
-- RLS es la defensa primaria, no la sesión (contexto arquitectónico §4).
-- El código de aplicación puede tener bugs; la base de datos debe negar
-- el acceso de todos modos.
--
-- MECANISMO
--
-- Cada conexión declara su tenant con:
--     SELECT set_config('app.tenant_id', '<id>', true)
--
-- El tercer parámetro `true` lo hace local a la transacción, así que el
-- valor no se filtra entre peticiones que comparten conexión del pool
-- —detalle crítico en serverless, donde el pool se reutiliza—.
--
-- Las políticas comparan tenant_id contra ese ajuste. Sin ajuste, las
-- políticas no dejan ver nada.
--
-- ⚠️  REQUISITO CRÍTICO: LA APP NO PUEDE CONECTARSE COMO SUPERUSUARIO
--
-- Postgres ignora RLS para roles con `rolsuper` o `rolbypassrls`, y
-- FORCE ROW LEVEL SECURITY NO cambia eso. Si DATABASE_URL apunta al rol
-- propietario/superusuario de Neon, las políticas de abajo se aplican
-- sin efecto alguno y el aislamiento es una ilusión.
--
-- Verificar ANTES de dar por buena esta migración:
--     SELECT rolname, rolsuper, rolbypassrls FROM pg_roles
--     WHERE rolname = current_user;
-- Ambos deben ser `f`. Si no, crear un rol dedicado:
--     CREATE ROLE sellix_app LOGIN PASSWORD '...';
--     GRANT USAGE ON SCHEMA public TO sellix_app;
--     GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sellix_app;
--     GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sellix_app;
-- y apuntar DATABASE_URL a ese rol. Las migraciones siguen corriendo
-- con el rol propietario.
--
-- ROL DE APLICACIÓN vs. PROPIETARIO
--
-- El propietario de una tabla ignora RLS por defecto en Postgres. Como
-- la app se conecta con el mismo rol que creó las tablas, se usa
-- FORCE ROW LEVEL SECURITY para que las políticas también le apliquen
-- (necesario, pero insuficiente si el rol es superusuario — ver arriba).
--
-- Excepción: los procesos de fondo (worker de clasificación, ETL,
-- migraciones) necesitan operar cross-tenant. Declaran
--     SELECT set_config('app.bypass_rls', 'on', true)
-- y las políticas lo respetan. Es un permiso explícito y acotado a la
-- transacción, no una puerta abierta.
--
-- TABLAS EXENTAS (sin tenant_id, por diseño — PRD §7.2):
--   productos_master  · taxonomía global compartida, sin PII ni precios
--   vertical_packs    · configuración de producto, igual para todos
--   schema_migrations · metadatos del esquema
--
-- Idempotente.
-- =============================================================

BEGIN;

-- ── Helpers ──────────────────────────────────────────────────

-- Tenant declarado por la conexión actual. NULL si no se declaró.
CREATE OR REPLACE FUNCTION app_current_tenant() RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '');
$$ LANGUAGE sql STABLE;

-- True si la transacción pidió operar cross-tenant (workers, ETL).
CREATE OR REPLACE FUNCTION app_bypass_rls() RETURNS BOOLEAN AS $$
  SELECT COALESCE(current_setting('app.bypass_rls', true), '') = 'on';
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION app_current_tenant() IS
  'Tenant de la conexión actual, fijado con set_config(''app.tenant_id'', ..., true). '
  'Siempre local a la transacción para que no se filtre entre peticiones del mismo pool.';

COMMENT ON FUNCTION app_bypass_rls() IS
  'Permiso explícito de operación cross-tenant para procesos de fondo. '
  'Acotado a la transacción que lo declara.';

-- ── Políticas ────────────────────────────────────────────────
--
-- Una política única por tabla, aplicable a todas las operaciones.
-- USING filtra lo que se puede leer/actualizar/borrar; WITH CHECK
-- impide insertar filas de otro tenant.

DO $$
DECLARE
  t TEXT;
  tablas TEXT[] := ARRAY[
    'productos_tenant', 'uploads', 'clientes', 'ventas',
    'classification_queue', 'campaigns', 'message_log', 'attributions',
    'prepared_actions', 'conversations', 'chat_messages', 'orders',
    'perfil_cliente_dinamico', 'audit_log', 'conversion_overrides', 'users'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t) THEN
      RAISE NOTICE 'Tabla % no existe, se omite', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant_isolation ON %I', t, t);
    EXECUTE format($f$
      CREATE POLICY %I_tenant_isolation ON %I
        USING (app_bypass_rls() OR tenant_id = app_current_tenant())
        WITH CHECK (app_bypass_rls() OR tenant_id = app_current_tenant())
    $f$, t, t);
  END LOOP;
END $$;

-- `tenants` se filtra por su clave primaria, no por una columna tenant_id.
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenants_isolation ON tenants;
CREATE POLICY tenants_isolation ON tenants
  USING (app_bypass_rls() OR id = app_current_tenant())
  WITH CHECK (app_bypass_rls() OR id = app_current_tenant());

-- ── Documentación de las exentas ─────────────────────────────
COMMENT ON TABLE productos_master IS
  'Catálogo global de taxonomía, compartido entre tenants para amortizar el costo de clasificación por LLM. '
  'SIN RLS de forma intencional (PRD v4.0 §7.2): no contiene PII ni precios, solo taxonomía de producto. '
  'La validez de una clasificación está acotada por pack_id. '
  'CONVIVENCIA: las columnas farmacéuticas son legado v3 y se eliminan en la migración 004.';

COMMENT ON TABLE vertical_packs IS
  'Configuración por vertical (PRD v4.0 §3.2). SIN RLS: es configuración de producto, '
  'idéntica para todos los tenants del mismo vertical. El Core es agnóstico al sector.';

COMMIT;
