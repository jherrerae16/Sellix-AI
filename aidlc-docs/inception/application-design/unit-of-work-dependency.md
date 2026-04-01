# Dependencias entre Unidades de Trabajo — Sellix AI

## Matriz de Dependencias

| Unidad | Depende de | Bloquea a |
|---|---|---|
| Unit 1 — Foundation & Auth | Ninguna | Unit 2, Unit 3, Unit 4 |
| Unit 2 — ETL Pipeline | Unit 1 (estructura de carpetas) | Unit 3, Unit 4 |
| Unit 3 — Módulos Fase 1 | Unit 1 + Unit 2 | Unit 4 (recomendado, no estricto) |
| Unit 4 — Módulos Fase 2 | Unit 1 + Unit 2 | Ninguna |

## Secuencia de Construcción

```
Unit 1 (Foundation & Auth)
    │
    ├──→ Unit 2 (ETL Pipeline)
    │           │
    │           ├──→ Unit 3 (Fase 1 Modules)
    │           │           │
    │           │           └──→ Unit 4 (Fase 2 Modules)
    │           │
    │           └──→ Unit 4 (puede comenzar en paralelo con Unit 3)
    │
    └── [Unit 3 y Unit 4 pueden desarrollarse en paralelo si Unit 2 está listo]
```

## Puntos de Integración Críticos

| Punto | Entre unidades | Qué se valida |
|---|---|---|
| JSON schema | Unit 2 → Unit 3/4 | Los JSON generados por ETL coinciden con las interfaces TypeScript de Unit 1 |
| public/data/ path | Unit 2 → Unit 3/4 | Los archivos JSON están en la ruta correcta que espera DataService |
| Auth middleware | Unit 1 → Unit 3/4 | Las páginas de módulos están protegidas correctamente |
| Types.ts | Unit 1 → Unit 2/3/4 | Las interfaces TypeScript son compatibles con la estructura de los JSON |

## Estrategia de Testing entre Unidades

| Test | Cuándo ejecutar |
|---|---|
| Unit 1 smoke test (auth + layout) | Al completar Unit 1 |
| ETL correctness test | Al completar Unit 2 — verificar los 8 JSON con datos reales |
| JSON→UI integration test | Al completar Unit 3 — datos del ETL se renderizan correctamente |
| Full dashboard test | Al completar Unit 4 — todos los módulos funcionan con datos reales |
