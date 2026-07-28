# Migraciones — Sellix AI

## Ejecutar

```bash
node scripts/migrate.mjs --status    # ver estado sin aplicar
node scripts/migrate.mjs --dry-run   # ver qué se aplicaría
node scripts/migrate.mjs             # aplicar pendientes
```

Cada archivo se registra en `schema_migrations` y no se repite. Los
archivos `.sql.pending` se ignoran a propósito: son migraciones que
requieren verificación manual antes de habilitarse (renombrar a `.sql`).

## Estado

| Archivo | Estado | Qué hace |
|---|---|---|
| `001_initial_schema.sql` | ✅ aplicada | Esquema base multi-tenant, 16 tablas |
| `002_generic_ontology.sql` | ✅ aplicada | Ontología genérica (expand), packs, vista de compatibilidad |
| `003_seed_packs.sql` | ✅ aplicada | Packs 000/001/002 |
| `005_users.sql` | ✅ aplicada | Tabla `users` con roles |
| `006_rls.sql` | ✅ aplicada | Row Level Security — **requiere el paso de rol, ver abajo** |
| `004_drop_legacy_ontology.sql.pending` | 🔒 bloqueada | Contract: borra columnas farmacéuticas |

## ⚠️ RLS aplicado pero todavía NO efectivo

Las 17 políticas existen y las queries de la aplicación ya declaran su
tenant. **Falta un paso, y sin él el aislamiento no se evalúa:**

`DATABASE_URL` apunta hoy a `neondb_owner`, que tiene `rolbypassrls = true`.
Postgres omite RLS para ese rol, así que las políticas están inertes.

Para activarlas de verdad, en la consola SQL de Neon:

```sql
CREATE ROLE sellix_app LOGIN PASSWORD '<contraseña fuerte>';
GRANT USAGE ON SCHEMA public TO sellix_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sellix_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sellix_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sellix_app;
```

Después, en Vercel, cambiar `DATABASE_URL` para que use `sellix_app` en
lugar de `neondb_owner` y redesplegar. Las migraciones se siguen
ejecutando con el rol propietario (el `DATABASE_URL` de `.env.local`).

Comprobar que quedó bien:

```sql
SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user;
```

Ambos deben ser `f`.

**Verificación del aislamiento:** `node scripts/test-rls.mjs` levanta un
Postgres desechable, aplica toda la cadena de migraciones y ejecuta las
queries reales de la aplicación con un rol restringido — comprueba que
sin tenant no se ve nada, que cada tenant ve solo lo suyo, que el worker
de fondo puede operar cross-tenant y que una escritura cruzada se rechaza.

## Migraciones bloqueadas: qué falta para habilitarlas

### 004 — Contract de la ontología

Borra `categoria_terapeutica`, `tratamiento`, `es_cronico`, `es_receta`,
`principio_activo`, `categoria_atc`, `tipo_tratamiento` de
`productos_master`, junto al trigger de sincronización.

Precondiciones:

1. Ningún código referencia las columnas legado:
   ```bash
   grep -rn "categoria_terapeutica\|tratamiento\|es_cronico\|es_receta\|principio_activo\|categoria_atc" src/ scripts/
   ```
   Solo deben quedar apariciones dentro de la vista `productos_master_v3`
   (como alias) o en comentarios. Hoy son ~23 archivos.
2. 24h de estabilidad en producción con el código nuevo.
3. Paridad verificada (PRD §11): mismos conteos de churn, pares de venta
   cruzada y recompras que antes de la migración 002.
4. Branch/backup de Neon tomado. **Este paso sí destruye datos.**

## Cómo declarar el tenant en una query

Todas las queries de la aplicación pasan por uno de estos dos helpers de
`src/lib/db.ts`. No se escriben queries con `sql` directo sobre tablas con
`tenant_id`.

```ts
// Petición de un usuario: el tenant sale de la sesión (nunca del request)
const ctx = await requireTenant();
if (!ctx.ok) return ctx.response;
const filas = await withTenant(ctx.tenantId, (tx) => tx`SELECT * FROM ventas`);

// Proceso de fondo que abarca varios tenants (worker, ETL, login)
const items = await withBypassRls((tx) => tx`SELECT * FROM classification_queue ...`);
```

`set_config(..., true)` hace el ajuste local a la transacción: en
serverless el pool reutiliza conexiones entre peticiones y un ajuste de
sesión se filtraría de un tenant al siguiente.

Excepciones legítimas a `withTenant`, todas sobre tablas exentas:
`productos_master`, `productos_master_v3`, `vertical_packs`.
