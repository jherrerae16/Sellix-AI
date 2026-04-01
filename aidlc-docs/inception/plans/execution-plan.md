# Plan de Ejecución — Sellix AI
## Plataforma de Inteligencia de Ventas para Droguerías

**Fecha**: 2026-04-01  
**Proyecto**: Greenfield · **Complejidad**: Complex · **Riesgo**: Medium

---

## 1. Análisis Detallado

### Evaluación de Impacto

| Área | Impacto | Descripción |
|---|---|---|
| Cambios para el usuario | Sí | Dashboard completo con 6 módulos de inteligencia comercial |
| Cambios estructurales | Sí | Nueva arquitectura Next.js + App Router + NextAuth.js |
| Cambios en modelo de datos | Sí | 8 interfaces TypeScript + 8 JSON generados por ETL |
| Cambios de API | N/A | No hay API REST propia — datos servidos como JSON estáticos |
| Impacto NFR | Sí | Seguridad (auth, headers), rendimiento (SSG), escalabilidad ETL |

### Evaluación de Riesgo

| Factor | Nivel | Justificación |
|---|---|---|
| Riesgo general | Medium | Múltiples componentes pero interfaces bien definidas |
| Complejidad de rollback | Bajo | Vercel permite rollback instantáneo; archivos JSON aislados |
| Complejidad de testing | Moderate | Algoritmos de scoring + integración ETL→frontend |
| Riesgo más alto | Auth | NextAuth.js + rutas protegidas + brute-force requieren pruebas exhaustivas |

---

## 2. Visualización del Flujo de Ejecución

```
INCEPTION PHASE
+------------------+    +----------------------+    +------------------+
| Workspace Det.   | -> | Requirements Analysis | -> | Workflow Planning|
| [COMPLETED]      |    | [COMPLETED]           |    | [IN PROGRESS]    |
+------------------+    +----------------------+    +------------------+
                                                              |
                         +------------------------------------+
                         v
+------------------+    +----------------------+    +------------------+
| User Stories     | -> | Application Design   | -> | Units Generation |
| [EXECUTE]        |    | [EXECUTE]            |    | [EXECUTE]        |
+------------------+    +----------------------+    +------------------+
                                                              |
CONSTRUCTION PHASE                       +--------------------+
                                         v
        +----------------------------+
        | Unit 1: Foundation + Auth  |
        | Functional Design [EXECUTE]|
        | NFR Requirements  [EXECUTE]|
        | NFR Design        [EXECUTE]|
        | Infra Design      [EXECUTE]|
        | Code Generation   [EXECUTE]|
        +----------------------------+
                    |
                    v
        +----------------------------+
        | Unit 2: ETL Pipeline       |
        | Functional Design [EXECUTE]|
        | NFR Requirements  [SKIP]   |
        | NFR Design        [SKIP]   |
        | Infra Design      [SKIP]   |
        | Code Generation   [EXECUTE]|
        +----------------------------+
                    |
                    v
        +----------------------------+
        | Unit 3: Fase 1 Modules     |
        | Functional Design [EXECUTE]|
        | NFR Requirements  [SKIP]   |
        | NFR Design        [SKIP]   |
        | Infra Design      [SKIP]   |
        | Code Generation   [EXECUTE]|
        +----------------------------+
                    |
                    v
        +----------------------------+
        | Unit 4: Fase 2 Modules     |
        | Functional Design [EXECUTE]|
        | NFR Requirements  [SKIP]   |
        | NFR Design        [SKIP]   |
        | Infra Design      [SKIP]   |
        | Code Generation   [EXECUTE]|
        +----------------------------+
                    |
                    v
        +----------------------------+
        | Build and Test [EXECUTE]   |
        +----------------------------+

OPERATIONS PHASE
        +----------------------------+
        | Operations [PLACEHOLDER]   |
        +----------------------------+
```

---

## 3. Etapas a Ejecutar

### 🔵 FASE DE INCEPTION

- [x] Workspace Detection — COMPLETADO
- [ ] Reverse Engineering — SALTADO (Greenfield)
- [x] Requirements Analysis — COMPLETADO
- [x] Workflow Planning — EN PROGRESO
- [ ] **User Stories — EXECUTE**
  - **Justificación**: 2 personas distintas (Gerente + Personal de caja) con flujos completamente diferentes. Múltiples módulos con criterios de aceptación complejos. Esencial para alinear comportamiento esperado por módulo.
- [ ] **Application Design — EXECUTE**
  - **Justificación**: Sistema nuevo con 6 módulos, capa de autenticación, pipeline ETL y layout shell. Se necesita definir límites de componentes, responsabilidades y dependencias.
- [ ] **Units Generation — EXECUTE**
  - **Justificación**: 4 unidades claramente diferenciadas (foundation+auth, ETL, Fase 1, Fase 2) que pueden construirse de forma secuencial con entregables verificables.

### 🟢 FASE DE CONSTRUCTION

#### Unit 1 — Project Foundation & Authentication
- [ ] **Functional Design — EXECUTE**
  - Justificación: Diseño de layout shell, componentes base, middleware auth, tipos TypeScript
- [ ] **NFR Requirements — EXECUTE**
  - Justificación: Security headers, NextAuth config, rate limiting en login, supply chain
- [ ] **NFR Design — EXECUTE**
  - Justificación: Incorporar SECURITY-04, SECURITY-08, SECURITY-11, SECURITY-12
- [ ] **Infrastructure Design — EXECUTE**
  - Justificación: next.config.js, Vercel config, middleware.ts, variables de entorno
- [ ] **Code Generation — EXECUTE** (siempre)

#### Unit 2 — ETL Pipeline (Python)
- [ ] **Functional Design — EXECUTE**
  - Justificación: Algoritmos complejos (churn scoring, market basket analysis, RFM quintiles, productos gancho) que requieren diseño detallado previo
- [ ] **NFR Requirements — SKIP**
  - Justificación: ETL es un script local sin requisitos de red/escalabilidad. NFR de reproducibilidad y volumen ya están en requirements.md
- [ ] **NFR Design — SKIP**
  - Justificación: NFR Requirements saltado
- [ ] **Infrastructure Design — SKIP**
  - Justificación: Script Python local — sin infraestructura de despliegue
- [ ] **Code Generation — EXECUTE** (siempre)

#### Unit 3 — Módulos Fase 1 (1.1 — 1.4)
- [ ] **Functional Design — EXECUTE**
  - Justificación: 4 páginas con lógica de presentación compleja, filtros, exportación CSV, componentes reutilizables
- [ ] **NFR Requirements — SKIP**
  - Justificación: NFRs heredados de Unit 1 (security headers, auth middleware ya aplicado)
- [ ] **NFR Design — SKIP**
  - Justificación: NFR Requirements saltado
- [ ] **Infrastructure Design — SKIP**
  - Justificación: Infraestructura definida en Unit 1
- [ ] **Code Generation — EXECUTE** (siempre)

#### Unit 4 — Módulos Fase 2 (2.1 — 2.2)
- [ ] **Functional Design — EXECUTE**
  - Justificación: Scatter plot RFM interactivo, panel de detalle por cliente, mapa de burbujas — componentes visuales complejos
- [ ] **NFR Requirements — SKIP**
  - Justificación: NFRs heredados de Unit 1
- [ ] **NFR Design — SKIP**
  - Justificación: NFR Requirements saltado
- [ ] **Infrastructure Design — SKIP**
  - Justificación: Infraestructura definida en Unit 1
- [ ] **Code Generation — EXECUTE** (siempre)

#### Cierre de Construction
- [ ] **Build and Test — EXECUTE** (siempre)

### 🟡 FASE DE OPERATIONS
- [ ] Operations — PLACEHOLDER (despliegue futuro)

---

## 4. Definición de Unidades de Trabajo

| Unidad | Contenido | Dependencias |
|---|---|---|
| **Unit 1**: Project Foundation & Auth | Next.js setup, NextAuth.js, layout shell (Sidebar, TopBar), `lib/types.ts`, `lib/formatters.ts`, next.config.js, middleware.ts | Ninguna |
| **Unit 2**: ETL Pipeline | `scripts/etl.py` completo — genera los 8 JSON de `public/data/` | Unit 1 (estructura de carpetas) |
| **Unit 3**: Módulos Fase 1 | `app/page.tsx` (1.1), `app/cruzada/` (1.2), `app/churn/` (1.3), `app/reposicion/` (1.4) + componentes y tablas | Unit 1 + Unit 2 (JSONs disponibles) |
| **Unit 4**: Módulos Fase 2 | `app/vip/` (2.1), `app/gancho/` (2.2) + ScatterRFM, BubbleGancho | Unit 1 + Unit 2 + Unit 3 |

---

## 5. Criterios de Éxito

- [ ] ETL genera los 8 JSON sin errores con los datos de Super Ofertas
- [ ] Dashboard carga en < 3 segundos en Vercel
- [ ] Churn identifica correctamente clientes ausentes vs. activos
- [ ] Venta cruzada genera ≥20 pares con Lift > 1.5
- [ ] Reposición predice correctamente siguiente compra en ≥70% de casos
- [ ] Gerente navega todos los módulos sin asistencia técnica
- [ ] Login con NextAuth.js funcional con brute-force protection
- [ ] Todos los headers de seguridad (SECURITY-04) presentes en respuestas HTTP
- [ ] CSV exportable en Churn y Reposición

---

## 6. Resumen de Extensiones de Seguridad

| Regla | Estado | Implementado en |
|---|---|---|
| SECURITY-01 | N/A | Sin base de datos persistente |
| SECURITY-02 | N/A | Vercel gestiona red |
| SECURITY-03 | EXECUTE | Unit 1 (logging Next.js) + Unit 2 (logging ETL) |
| SECURITY-04 | EXECUTE | Unit 1 — next.config.js headers |
| SECURITY-05 | EXECUTE | Unit 1 (inputs login) + Unit 3/4 (búsquedas) |
| SECURITY-06 | N/A | Sin IAM policies propias |
| SECURITY-07 | N/A | Sin VPC propia |
| SECURITY-08 | EXECUTE | Unit 1 — middleware.ts NextAuth |
| SECURITY-09 | EXECUTE | Unit 1 — error handling genérico |
| SECURITY-10 | EXECUTE | Unit 1 — package-lock.json, sin deps sin uso |
| SECURITY-11 | EXECUTE | Unit 1 — rate limiting en /api/auth/signin |
| SECURITY-12 | EXECUTE | Unit 1 — NextAuth session config |
| SECURITY-13 | EXECUTE | Unit 1 — SRI en recursos externos |
| SECURITY-14 | EXECUTE | Unit 1 + Unit 3/4 — alertas de auth failures |
| SECURITY-15 | EXECUTE | Unit 1 — global error handler Next.js |
