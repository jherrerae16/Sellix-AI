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
| `005_users.sql` | ⏳ por aplicar | Tabla `users` con roles |
| `004_drop_legacy_ontology.sql.pending` | 🔒 bloqueada | Contract: borra columnas farmacéuticas |
| `006_rls.sql.pending` | 🔒 bloqueada | Row Level Security |

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

### 006 — Row Level Security

**Bloqueante #1: el rol de conexión.**

La app se conecta hoy como `neondb_owner`, que tiene `rolbypassrls = true`.
Postgres ignora RLS para esos roles, y `FORCE ROW LEVEL SECURITY` no lo
cambia. Aplicar la migración con este rol daría un aislamiento aparente
pero inexistente — peor que no tenerlo, porque invita a confiar.

Verificar:

```sql
SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user;
```

Ambos deben ser `f`. Si no, crear un rol dedicado y apuntar ahí
`DATABASE_URL` (las migraciones siguen corriendo con el rol propietario):

```sql
CREATE ROLE sellix_app LOGIN PASSWORD '...';
GRANT USAGE ON SCHEMA public TO sellix_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sellix_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sellix_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sellix_app;
```

**Bloqueante #2: 45 queries sin contexto de tenant.**

Ejecutan `sql` directo, sin declarar el tenant de la conexión. Con RLS
activo devolverían cero filas y la aplicación quedaría vacía. Hay que
envolverlas en `withTenant()` (o `withBypassRls()` en procesos de fondo,
que son cross-tenant por diseño):

| Archivo | Nota |
|---|---|
| `src/lib/dataServiceDb.ts` | El grueso de las queries analíticas |
| `src/app/api/upload/route.ts` | |
| `src/app/api/actions/{prepare,prepared,approve}/route.ts` | |
| `src/app/api/inbox/insights/route.ts` | |
| `src/app/api/products/search/route.ts` | |
| `src/app/api/classification/process/route.ts` | `withBypassRls` — worker cross-tenant |

**Verificación recomendada:** aplicar en una rama de Neon, apuntar la app
ahí y comprobar que los dashboards siguen mostrando datos antes de tocar
producción.

El aislamiento ya está validado end-to-end en un Postgres desechable con
un rol sin privilegios: sin tenant declarado no se ve nada, cada tenant ve
solo lo suyo, el bypass funciona para workers, y un INSERT cruzado es
rechazado por la base de datos.
