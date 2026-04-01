# Plan de Generación de User Stories — Sellix AI

**Enfoque adoptado**: Análisis del PRD confirma que las historias se organizarán por Épicas de Módulo con descomposición por persona. El PRD ya define las personas y reglas de negocio, lo que permite un plan preciso con pocas preguntas de clarificación.

---

## PARTE 1 — Preguntas de Planificación

Por favor responde cada pregunta escribiendo la letra de tu elección después del tag `[Answer]:`.

---

### Pregunta 1 — Idioma de las user stories

¿En qué idioma deben estar escritas las user stories?

A) Español — consistente con el idioma de la UI y del cliente piloto
B) Inglés — idioma técnico del equipo de desarrollo
C) Bilingüe — título en español, criterios de aceptación en inglés
D) Otro (describe después del tag [Answer]:)

[Answer]: A

---

### Pregunta 2 — Formato de criterios de aceptación

¿Qué formato usaremos para los criterios de aceptación de cada historia?

A) Gherkin (Given / When / Then) — estándar BDD, compatible con pruebas automatizadas
B) Lista de condiciones en lenguaje natural — más simple, más rápido de escribir
C) Ambos — Gherkin para historias de funcionalidad crítica, lista natural para el resto
D) Otro (describe después del tag [Answer]:)

[Answer]: C

---

### Pregunta 3 — Granularidad de las historias

El PRD define 6 módulos con múltiples funcionalidades cada uno. ¿Cómo deseas descomponer las historias?

A) Una historia por módulo completo (6 historias épicas de alto nivel)
B) Una historia por requerimiento funcional principal (aprox. 20–25 historias)
C) Épicas por módulo + historias hijas por funcionalidad (jerarquía 2 niveles, aprox. 6 épicas + 20 historias)
D) Otro (describe después del tag [Answer]:)

[Answer]: C

---

### Pregunta 4 — Persona para el acceso ETL

El ETL es ejecutado por el desarrollador/implementador, no por el usuario final. ¿Cómo modelamos esto en las historias?

A) Incluir una persona "Implementador / Next AI Tech" con historias técnicas del ETL
B) El ETL no necesita historias de usuario — solo documentación técnica en code-generation
C) Otro (describe después del tag [Answer]:)

[Answer]: A

---

## PARTE 2 — Plan de Ejecución (se completa después de recibir respuestas)

### Artefactos a generar
- [ ] `aidlc-docs/inception/user-stories/personas.md` — perfiles detallados de cada persona
- [ ] `aidlc-docs/inception/user-stories/stories.md` — historias completas con criterios de aceptación

### Épicas identificadas (pre-cargadas del PRD)

| Épica | Módulo | Persona principal |
|---|---|---|
| E1 | Vista general del negocio (Resumen Ejecutivo) | Gerente |
| E2 | Recomendaciones en punto de venta (Venta Cruzada) | Cajero + Gerente |
| E3 | Detección de clientes en riesgo (Churn) | Gerente |
| E4 | Predicción de reposición de medicamentos | Gerente |
| E5 | Segmentación y protección de clientes VIP (RFM) | Gerente |
| E6 | Identificación de productos gancho | Gerente |
| E7 | Acceso seguro al sistema (Autenticación) | Gerente + Cajero |

### Personas identificadas (pre-cargadas del PRD)
1. **Carlos** — Gerente / Propietario de la Droguería
2. **Valentina** — Personal de Caja / Vendedora
3. (condicional) **Andrés** — Implementador / Next AI Tech LLC

### Criterios de calidad INVEST a verificar por historia
- [ ] Independent — no depende de otra historia para ser entregable
- [ ] Negotiable — puede ajustarse en detalles de implementación
- [ ] Valuable — aporta valor al usuario identificado
- [ ] Estimable — puede estimarse en esfuerzo de desarrollo
- [ ] Small — completable en una iteración
- [ ] Testable — tiene criterios de aceptación verificables

### Pasos de generación (se activan tras aprobación del plan)
- [x] Paso 1: Generar personas.md con Carlos, Valentina y Andrés
- [x] Paso 2: Generar Épicas E1–E8 con descripción y valor de negocio
- [x] Paso 3: Descomponer cada épica en historias hijas (27 historias en total)
- [x] Paso 4: Agregar criterios de aceptación (Gherkin en E2-02, E3-01, E7-01, E8-01; lista natural en resto)
- [x] Paso 5: Mapear cada historia a la persona correspondiente
- [x] Paso 6: Verificar cumplimiento INVEST en todas las historias
- [x] Paso 7: Cobertura verificada — 100% de RF del requirements.md representados
