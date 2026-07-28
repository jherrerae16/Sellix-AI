# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## Sellix AI
### Agente Comercial Autónomo y Plataforma de Revenue Intelligence para Comercio Conversacional

**Versión:** 4.0 — *Reposicionamiento horizontal*
**Fecha:** Julio 2026
**Autor:** Juan David Herrera
**Empresa:** Next AI Tech LLC
**Estado:** v3.x en producción (vertical farmacia, ya sobre Postgres) → v4.0 en implementación
**Tipo de producto:** SaaS multi-tenant · Agente de Ventas IA · CRM Conversacional · Revenue Intelligence
**Repositorio:** github.com/jherrerae16/SellixAI-MVP
**Reemplaza:** PRD v3.0 (Abril 2026)

---

## 0. NOTA DE REVISIÓN — QUÉ CAMBIA RESPECTO A v3.0 Y POR QUÉ

Este documento no es una versión incremental. Es un **reposicionamiento de producto**: Sellix AI pasa de ser una plataforma de inteligencia comercial *para droguerías* a ser un **agente de ventas autónomo para cualquier negocio que venda productos de forma repetida**.

### 0.1 Diagnóstico del v3.0

El v3.0 es un producto sólido y funcional, pero su especificidad no está en la capa de presentación — está en el **modelo de datos**. Estos son los puntos de acoplamiento reales, verificados contra el código en Julio 2026:

| # | Acoplamiento al vertical farmacia | Severidad | Dónde vive (verificado) |
|---|---|---|---|
| 1 | `categoria_terapeutica` y `tratamiento` como campos de primera clase | **Crítica** | `db/migrations/001_initial_schema.sql` (tabla `productos_master`, 5 columnas + 2 índices) y 23 archivos de `src/` y `scripts/` |
| 2 | Tipos de churn definidos como `churn_tratamiento` / `churn_cronico` | Alta | `dataServiceDb.ts:373-406`, `types.ts:387-388` |
| 3 | Tasas de conversión fijas "del sector farmacéutico" (35–70%) | **Crítica** | `CONVERSION` en `src/app/api/actions/route.ts:17-41` |
| 4 | Ticket por defecto hardcodeado a valores de droguería | **Crítica** | `DEFAULT_PHARMACY_TICKET = 85000`, `DEFAULT_REPO_TICKET = 55000` en `actions/route.ts:43-44` |
| 5 | Scoring de promociones con señales farmacéuticas | Alta | `SCORE` en `src/app/api/promotions/match/route.ts:26` |
| 6 | Filtros de recompra calibrados a medicación crónica (CV ≤ 0.6, ciclo ≤ 120d) | Alta | `etl.ts` |
| 7 | Prompt de clasificación explícitamente farmacéutico | Media | `classification/process/route.ts:159` — *"Clasifica estos productos farmacéuticos colombianos"* |
| 8 | Análisis de recetas médicas con Vision como módulo core | Media | `prescriptionAnalyzer.ts` |
| 9 | Competencia hardcodeada (Cruz Verde, Farmatodo, La Rebaja, Olímpica) | Baja | Cotizador |
| 10 | Prompt del Vendedor IA con identidad fija "Droguería Super Ofertas" | Baja | `salesAgent.ts` |

> **Nota respecto al borrador anterior de este PRD:** el punto 4 (ticket por defecto) no estaba documentado y es de severidad crítica — un pet shop con ticket promedio de $35.000 vería proyecciones infladas ~2.4× si el fallback farmacéutico se activa.

### 0.2 Bloqueadores arquitectónicos — estado real (Julio 2026)

El borrador anterior de este PRD listaba cinco bloqueadores. **Tres ya están resueltos** en producción; el documento se corrige aquí para no planear trabajo ya hecho:

| Bloqueador | Estado | Evidencia |
|---|---|---|
| ~~Persistencia por JSON estáticos~~ | ✅ **Resuelto** | Postgres (Neon) vía driver `postgres` 3.4.9. `src/lib/db.ts` + `src/lib/dataServiceDb.ts` (36 KB). 16 tablas en `001_initial_schema.sql` |
| ~~CRM solo en Redis~~ | ✅ **Resuelto** | Tablas `conversations`, `chat_messages`, `orders` en Postgres. Redis queda como caché de estado en vivo |
| ~~Sin aislamiento por tenant~~ | ✅ **Parcial** | `tenant_id` presente en **todas** las tablas operativas + tabla `tenants` con `config JSONB`. Falta RLS (ver abajo) |
| **RLS no implementado** | ❌ **Pendiente** | Cero `ROW LEVEL SECURITY` en la migración. El aislamiento hoy depende de que cada query incluya `WHERE tenant_id = …`. Es correcto pero frágil: un solo `WHERE` olvidado filtra datos entre tenants |
| **Sin `tenant_id` en la sesión** | ❌ **Pendiente** | El claim JWT no transporta tenant; se usa `DEFAULT_TENANT_ID` de variable de entorno (`db.ts:44`) |
| **ETL síncrono** | ❌ **Pendiente** | Sigue corriendo en scripts locales / requests. No escala a multi-tenant |
| **Filesystem read-only en Vercel** | ⚠️ **Mitigado** | `/upload` ahora persiste en tabla `uploads`, pero el procesamiento sigue acoplado a la request |
| **Twilio Sandbox** | ❌ **Pendiente** | Impide onboarding self-serve |
| **Cero tests de scoring** | ❌ **Pendiente** | `src/lib/__tests__/` existe pero está vacío |

### 0.2.1 Activos no documentados que aceleran el v4.0

Dos piezas construidas después del PRD v3.0 resuelven por adelantado problemas que este documento planeaba abordar:

- **`productos_master` es un catálogo global compartido entre tenants**, con `productos_tenant` guardando solo precio/stock/nombre local. Una vez que Gemini clasifica un código, todos los tenants lo aprovechan. Esto es exactamente la mitigación de costo de LLM que la §14.1 proponía como pendiente — ya está construida.
- **`classification_queue` + `/api/classification/process`** dan clasificación asíncrona por lotes con reintentos. Es la base sobre la que se monta la clasificación en dos pasadas de la §5.2.

### 0.3 Las tres decisiones estructurales del v4.0

1. **Core genérico + Vertical Packs.** Un núcleo agnóstico al sector, más paquetes de configuración por industria. El trabajo de farmacia no se descarta: se convierte en el **Pack 001**, y en la prueba de que la arquitectura funciona.
2. **Ontología configurable en lugar de taxonomía terapéutica.** Tres niveles genéricos (`categoría` → `subcategoría` → `grupo de afinidad`) cuyos nombres y semántica define cada pack.
3. **Tasas de conversión calibradas, no declaradas.** Sistema de tres niveles con procedencia visible en UI. Un número que el cliente usa para tomar decisiones de inventario tiene que decir de dónde salió.

---

## 1. RESUMEN EJECUTIVO

Sellix AI es un **agente comercial autónomo** que se conecta al historial de ventas y al WhatsApp de un negocio, y ejecuta cuatro funciones que hoy dependen de que alguien tenga tiempo y memoria:

| Pilar | Qué hace el agente |
|---|---|
| **Vende** | Atiende WhatsApp 24/7: responde, cotiza con precios reales, sugiere complementos, arma pedido y cobra |
| **Recupera** | Detecta clientes que se están yendo o que ya se fueron, y los contacta con el motivo correcto |
| **Promociona** | Ante inventario o una oferta, identifica quién tiene mayor probabilidad de comprarlo y le escribe |
| **Explica** | Traduce el historial de ventas en decisiones: qué recomprar, qué combinar, quién vale más, qué producto atrae tráfico |

**Cambio de v3.0 a v4.0:** el mismo motor deja de asumir que el negocio vende medicamentos. Funciona para cualquier comercio con **compra repetida y catálogo de SKUs**: droguerías, pet shops, cosmética, ferreterías, repuestos, licoreras, distribuidoras B2B, minimercados, suplementos, papelerías.

**Qué se conserva íntegro:** el CRM conversacional con embudo automático, el vendedor IA, el motor de market basket, la predicción de recompra, la segmentación RFM, el generador de ofertas dirigidas y el sistema de atribución/comisiones. Toda esa lógica es estadísticamente agnóstica al sector.

**Qué se rehace:** la capa de ontología, la calibración de parámetros y el onboarding. **La persistencia ya está rehecha** (Postgres multi-tenant) — falta cerrarla con RLS.

**Cliente de referencia:** Droguería Super Ofertas (Barranquilla) — pasa de "cliente piloto" a **caso de validación del Pack 001**. Existe hoy como tenant `superofertas`.

---

## 2. REPOSICIONAMIENTO: DE VERTICAL A HORIZONTAL

### 2.1 Criterio de aplicabilidad (a quién sirve y a quién no)

Sellix AI aporta valor cuando se cumplen **al menos tres** de estas condiciones:

| Condición | Por qué importa |
|---|---|
| Catálogo de ≥ 200 SKUs | Debajo de eso, el dueño ya sabe de memoria qué se vende con qué |
| Compra repetida (ciclo < 18 meses) | Sin recompra no hay churn, ni reposición, ni recuperación |
| ≥ 300 clientes identificables | Umbral estadístico mínimo para market basket y RFM |
| Historial de ≥ 6 meses de transacciones | Necesario para detectar ciclos y estacionalidad |
| WhatsApp como canal comercial real | Es el sustrato del agente |
| Teléfono asociado a la venta en ≥ 40% de casos | Sin contactabilidad, la inteligencia no es accionable |

**Dónde el producto NO encaja (declararlo explícitamente evita malas ventas):**
- Bienes durables de compra única sin postventa (muebles, colchones)
- Servicios sin catálogo de SKU (consultoría, salud profesional)
- Retail de ticket alto y baja frecuencia sin datos de cliente (concesionarios)
- Negocios de venta 100% anónima al paso (panaderías de mostrador sin registro de cliente)

### 2.2 Verticales objetivo priorizados

| Prioridad | Vertical | Pack | Justificación |
|---|---|---|---|
| P0 | Farmacia / droguería | 001 | Validado en producción, ciclos limpios, alto valor de recuperación |
| P0 | Pet shop / veterinaria | 002 | Consumible puro (alimento), ciclo corto y estable, LATAM en crecimiento |
| P1 | Cosmética y cuidado personal | 003 | Alta recompra, fuerte venta cruzada, WhatsApp nativo |
| P1 | Suplementos / nutrición deportiva | 004 | Ciclo mensual casi determinístico |
| P1 | Licorera / minimercado | 005 | Volumen alto, market basket muy rico |
| P2 | Ferretería | 006 | Catálogo enorme, ciclo irregular, requiere ajuste de recompra |
| P2 | Repuestos automotores | 007 | Requiere ontología por compatibilidad (vehículo), no por afinidad |
| P2 | Distribuidora B2B | 008 | Lista de precios por cliente y crédito — cambia el modelo de datos |

---

## 3. ARQUITECTURA DE PRODUCTO: CORE + VERTICAL PACKS

### 3.1 Principio

> El **Core** no sabe qué vende el negocio. El **Pack** se lo enseña mediante configuración, nunca mediante código.

Ningún módulo del Core puede contener un `if (vertical === 'farmacia')`. Si aparece esa necesidad, es señal de que falta un parámetro en el esquema de Pack.

### 3.2 Anatomía de un Vertical Pack

Un Pack es un objeto de configuración versionado, no un fork de código. Se persiste en la tabla `vertical_packs` y se asocia a cada tenant vía `tenants.pack_id`:

```jsonc
{
  "pack_id": "002",
  "nombre": "Pet Shop / Veterinaria",
  "version": "1.0.0",

  // 1. ONTOLOGÍA — nombres de los 3 niveles y su semántica
  "ontologia": {
    "nivel_1": { "clave": "categoria",   "label": "Categoría", "ejemplo": "Alimento seco" },
    "nivel_2": { "clave": "subcategoria","label": "Línea",     "ejemplo": "Perro adulto raza grande" },
    "nivel_3": { "clave": "afinidad",    "label": "Necesidad", "ejemplo": "Control de peso" }
  },

  // 2. PROMPT DE CLASIFICACIÓN — reemplaza el prompt terapéutico
  "clasificador_prompt": "Clasifica cada producto de un pet shop en categoría, línea y necesidad...",

  // 3. PARÁMETROS DE RECOMPRA
  "recompra": {
    "min_compras": 3,
    "cv_max": 0.55,
    "ciclo_max_dias": 90,
    "ventana_preventiva_dias": 7
  },

  // 4. DEFINICIÓN DE CHURN
  "churn": {
    "dias_inactividad_total": 120,
    "dias_riesgo": 45,
    "umbral_downgrade_pct": 30,
    "items_ancla": ["alimento"]
  },

  // 5. TASAS DE CONVERSIÓN PRIOR (defaults del vertical, ver §9)
  "conversion_prior": {
    "recuperacion_ancla": 0.30,
    "reactivacion_total": 0.12,
    "vip_inactivo": 0.22,
    "recompra_vencida": 0.50,
    "recompra_preventiva": 0.65,
    "downgrade_liftback": 0.35,
    "lealtad": 0.18
  },

  // 6. TICKET DE REFERENCIA — reemplaza DEFAULT_PHARMACY_TICKET
  //    Fallback usado solo cuando el tenant no tiene historial suficiente.
  "ticket_referencia": { "general": 45000, "recompra": 38000 },

  // 7. MÓDULOS HABILITADOS
  "modulos": {
    "recompra": true,
    "captura_visual": true,
    "comparador_competencia": true,
    "postventa_durables": false
  },

  // 8. CAPTURA VISUAL — qué sabe leer la IA de una foto
  "captura_visual": {
    "modos": ["lista_compras", "foto_producto", "etiqueta_empaque"],
    "prompt": "Identifica los productos de alimento y accesorios para mascotas visibles..."
  },

  // 9. IDENTIDAD Y TONO DEL AGENTE
  "agente": {
    "competidores_referencia": ["Agrocampo", "Kanu", "Laika"],
    "restricciones_tono": ["No dar diagnóstico veterinario", "Derivar salud animal al profesional"]
  },

  // 10. GLOSARIO DE UI — reetiquetado sin tocar componentes
  "labels": {
    "recompra": "Próxima ración",
    "afinidad": "Necesidad"
  }
}
```

### 3.3 Modo genérico (Pack 000)

Todo tenant que no encaje en un pack existente arranca con el **Pack 000 – Genérico**: ontología neutra (`Categoría / Subcategoría / Grupo`), priors conservadores, y clasificación de catálogo por LLM sin sesgo sectorial. Un pack específico se puede aplicar después sin reprocesar transacciones — solo se reclasifica el catálogo.

---

## 4. MODELO DE DATOS UNIVERSAL

### 4.1 Esquema canónico de transacción

Todo lo que Sellix AI calcula se deriva de una sola tabla (`ventas`). Contrato mínimo, con el mapeo a las columnas que ya existen:

| Campo canónico | Requerido | Columna actual en `ventas` | Notas |
|---|---|---|---|
| `tenant_id` | ✅ | `tenant_id` | Ya presente. Aislamiento multi-tenant |
| `transaccion_id` | ✅ | `sesion` | Ya presente. Agrupa líneas de un ticket — base del market basket |
| `fecha` | ✅ | `fecha` | Ya presente |
| `cliente_id` | ⚠️ | `cedula` | Ya presente. **A renombrar** — `cedula` es específico de Colombia |
| `telefono` | ⚠️ | vía `clientes.telefono` | Determina **contactabilidad** |
| `sku` | ✅ | `codigo` | Ya presente |
| `nombre_producto` | ✅ | `producto` | Ya presente. Input del clasificador |
| `cantidad` | ✅ | `cantidad` | Ya presente |
| `precio_unitario` | ✅ | derivado de `total`/`cantidad` | **A añadir** como columna explícita |
| `costo_unitario` | ➖ | — | **A añadir.** Habilita análisis por margen |
| `canal` | ➖ | — | **A añadir.** mostrador / whatsapp / web / domicilio |
| `vendedor_id` | ➖ | — | **A añadir.** Habilita ranking de equipo |
| `sucursal_id` | ➖ | — | **A añadir** |

**Todo lo demás es derivado.** Categoría, afinidad, tipo de cliente, riesgo de churn, ciclo de recompra: ninguno se pide al cliente, todos se calculan.

> **Decisión sobre `cedula`:** el renombrado a `cliente_id` se difiere a Fase D. Es un cambio de alto alcance (clave primaria de `clientes`, FK lógica en 6 tablas) y no bloquea la horizontalidad — un pet shop puede guardar cualquier identificador en esa columna. Se documenta como deuda técnica explícita.

### 4.2 Ingesta: el mapeador inteligente de columnas

El onboarding actual asume un Excel con la estructura exacta de la droguería piloto. Para un producto horizontal esto es el principal punto de fricción — y también la mayor oportunidad de diferenciación.

**Flujo propuesto:**

1. El usuario sube el export de su POS (Excel/CSV, cualquier estructura).
2. Sellix lee las primeras 200 filas y las envía al LLM con el esquema canónico.
3. El LLM propone un **mapeo columna→campo** con nivel de confianza por campo.
4. La UI muestra el mapeo propuesto con vista previa de 10 filas reales y permite corregir con un dropdown.
5. El mapeo se guarda como **perfil de importación reutilizable** por tenant (y se sugiere a futuros tenants con la misma huella de columnas → biblioteca de conectores POS emergente).
6. Validación bloqueante antes de procesar: ≥ 6 meses de datos, ≥ 300 clientes únicos, ≥ 40% de filas con teléfono. Si no se cumple, se advierte explícitamente qué módulos quedarán degradados.

**Conectores directos (Fase 8):** Siesa, Helisa, World Office, Loggro, Alegra, Bsale.

### 4.3 Consumible vs. durable

Cada categoría lleva un flag `naturaleza`:

| Valor | Efecto |
|---|---|
| `consumible` | Entra en predicción de recompra |
| `durable` | Excluido de recompra; entra en **postventa** (accesorios, mantenimiento, garantía, upgrade) |
| `estacional` | Recompra modelada por calendario, no por ciclo individual |

Esto es lo que permite que una ferretería use el mismo motor: el silicón es consumible, el taladro es durable y genera oportunidades de broca y disco.

---

## 5. MOTOR DE ONTOLOGÍA (REEMPLAZA LA CLASIFICACIÓN TERAPÉUTICA)

### 5.1 Estructura de tres niveles

| Nivel | Genérico | Farmacia (Pack 001) | Pet Shop (002) | Cosmética (003) | Ferretería (006) |
|---|---|---|---|---|---|
| 1 | Categoría | Categoría terapéutica | Categoría | Categoría | Familia |
| 2 | Subcategoría | Grupo farmacológico | Línea | Línea | Subfamilia |
| 3 | Grupo de afinidad | Tratamiento | Necesidad | Rutina | Proyecto / aplicación |

El **nivel 3 (afinidad)** es la abstracción clave. En farmacia significa "tratamiento crónico"; en cosmética, "rutina facial nocturna"; en ferretería, "instalación de baño". En los tres casos cumple la misma función algorítmica: **agrupar productos que un mismo cliente compra en secuencia por una razón subyacente compartida.** Toda la lógica de churn, cross-sell y scoring que hoy usa `tratamiento` funciona sin cambios sobre `afinidad`.

### 5.2 Mapeo de columnas: v3 → v4

| Columna v3 (`productos_master`) | Columna v4 | Semántica |
|---|---|---|
| `categoria_terapeutica` | `categoria` | Nivel 1 |
| `subcategoria` | `subcategoria` | Nivel 2 (sin cambio) |
| `tratamiento` | `afinidad` | Nivel 3 |
| `tipo_tratamiento` | `tipo_afinidad` | `continua` / `puntual` / `ocasional` / `preventiva` / `no_aplica` |
| `es_cronico` | `es_ancla` | Producto cuyo abandono es señal crítica |
| `es_receta` | `requiere_autorizacion` | Genérico: receta médica, permiso, licencia |
| `principio_activo` | `atributo_clave` | Ingrediente activo, material, compatibilidad |
| `categoria_atc` | `codigo_externo` | Código de taxonomía estándar del vertical |

**Estrategia de migración: vistas de compatibilidad.** La migración `002` renombra las columnas y crea una vista `productos_master_v3` que expone los nombres antiguos. El código existente sigue funcionando sin cambios mientras se migran los 23 archivos uno por uno. Cero downtime.

### 5.3 Clasificación del catálogo

Se conserva el enfoque de v3 (LLM en batches de 30 con `classification_queue`), generalizado:

- **Input:** catálogo del tenant + `clasificador_prompt` del pack + taxonomía sugerida.
- **Proceso:** batches de 30 SKUs, con esquema JSON forzado y validación contra la taxonomía. El esquema de respuesta deja de estar hardcodeado en `classification/process/route.ts` y se deriva de `ontologia` del pack.
- **Dos pasadas:** la primera propone la taxonomía a partir de una muestra de 300 SKUs; la segunda clasifica el catálogo completo contra la taxonomía aprobada. Esto evita la proliferación de categorías que ocurre al clasificar en batches independientes.
- **Revisión humana:** el dueño revisa y edita la taxonomía propuesta antes de la pasada completa. HITL obligatorio — es la decisión que condiciona todo lo demás.
- **Reclasificación incremental** al agregar SKUs nuevos (ya soportado por `classification_queue`).
- **Caché entre tenants:** `productos_master` es global. Un código ya clasificado por un tenant sirve a todos los del mismo pack. **Restricción:** la caché debe segmentarse por `pack_id` — el mismo código de barras clasificado bajo taxonomía farmacéutica no es válido bajo taxonomía de pet shop.
- **Meta de cobertura:** ≥ 98% de SKUs clasificados (v3 alcanzó 99.9% en farmacia).

---

## 6. LOS CUATRO PILARES DEL AGENTE

### 6.1 Pilar VENDER — Agente conversacional autónomo

Módulo: `/inbox` + webhook WhatsApp. **Sin cambios estructurales respecto a v3**, con estas generalizaciones:

| Elemento | v3.0 | v4.0 |
|---|---|---|
| Identidad | "Droguería Super Ofertas" hardcoded | Perfil de negocio por tenant (nombre, tono, horarios, políticas, zona de domicilio) |
| Restricciones de dominio | Reglas farmacéuticas | `restricciones_tono` del pack + reglas propias del tenant |
| Comparación de precios | 4 farmacias fijas | `competidores_referencia` del pack + competidores propios del tenant |
| Venta cruzada en chat | Pares de lift sobre catálogo farma | Idéntico motor, ontología del pack |
| Análisis de imagen | Receta médica | **Captura de demanda visual** multi-modo (ver §6.1.1) |

**Reglas invariantes del system prompt (se conservan de v3 y se elevan a garantía de producto):**
1. Nunca inventar precios — solo del catálogo del tenant.
2. Nunca ofrecer productos fuera del catálogo.
3. Un "no" a una sugerencia de cross-sell no cancela el pedido en curso.
4. Reintento (2 intentos) antes de escalar a humano.
5. Escalado automático a humano ante: reclamo, mención de problema de salud/seguridad, monto sobre umbral configurable, o tres turnos sin avanzar.

#### 6.1.1 Captura de demanda visual (generaliza el análisis de recetas)

El cliente manda una foto; el agente extrae intención de compra. Modos habilitados por pack:

| Modo | Aplica a | Extrae |
|---|---|---|
| `lista_compras` | Todos | Ítems de una lista manuscrita o digital |
| `foto_producto` | Todos | Identificación de producto por empaque/etiqueta |
| `receta` | Farmacia (001) | Medicamento, dosis, presentación, cantidad |
| `cotizacion_competencia` | Todos | Ítems y precios de una cotización rival → contraoferta |
| `placa_vin` | Repuestos (007) | Vehículo → filtrado de compatibilidad |
| `plano_medidas` | Ferretería (006) | Materiales y cantidades de un proyecto |

Salida unificada en todos los modos: lista de ítems → match contra catálogo (`exacto` / `similar` / `no encontrado`) → total estimado → respuesta formateada → tag y avance de etapa en el embudo.

#### 6.1.2 Modos de operación

Se conserva el toggle de v3 — **Automático / Co-piloto / Manual** — y se agrega:
- Modo por horario (automático fuera de horario, co-piloto en horario laboral).
- Modo por etapa del embudo (automático en lead, manual en cierre de venta alta).

### 6.2 Pilar RECUPERAR — Clientes olvidados

Módulo: `/churn` + `/recompra`.

#### 6.2.1 Tipología de churn generalizada

| v3.0 (farmacia) | v4.0 (genérico) | Definición |
|---|---|---|
| `activo` | `activo` | Compra dentro del ciclo esperado |
| `churn_riesgo` | `en_riesgo` | Excedió 1.5× su ciclo habitual |
| `churn_tratamiento` | `abandono_afinidad` | Dejó ≥2 productos de un mismo grupo de afinidad |
| `churn_cronico` | `abandono_ancla` | Abandonó una categoría marcada como ancla en el pack |
| `churn_total` | `churn_total` | Sin compras en `dias_inactividad_total` |
| `downgrade` | `downgrade` | Sigue comprando pero bajó ticket > umbral |
| `alto_valor_inactivo` | `alto_valor_inactivo` | Percentil superior de valor con actividad decreciente |

Nótese que **seis de siete tipos ya eran genéricos**. Solo `churn_tratamiento` y `churn_cronico` requerían abstracción, y ambos se resuelven con el concepto de `afinidad` + `items_ancla`.

#### 6.2.2 Predicción de recompra generalizada

El motor de v3 (mín. 3 compras, CV ≤ 0.6, ciclo ≤ 120d) es correcto pero está calibrado para medicación crónica. En v4:

- Los tres parámetros son **configuración de pack**, no constantes.
- Se añade **ciclo por categoría**, no solo por par cliente-SKU: si un cliente compró alimento de perro una sola vez, el ciclo de la categoría (aprendido de todos los clientes) da una estimación útil aunque no haya historial individual suficiente.
- Se añade **ajuste por cantidad**: quien compra 2 unidades tiene un ciclo esperado ~2× mayor. En v3 esto no se modelaba y sesga la predicción en verticales donde la cantidad varía (pet shop, licorera).
- Los durables no entran; generan **postventa** (accesorio, consumible asociado, mantenimiento, upgrade) usando las asociaciones de market basket con desfase temporal.

Se conservan los 3 tabs (Vencido / Esta semana / Próximo mes), el filtro Contactables y el drawer con timeline.

#### 6.2.3 Motor de Next Best Action

Se conservan las 7 acciones de v3, renombradas al vocabulario genérico y con cifras calibradas (§9):

1. Recuperar abandono de categoría ancla — *crítica*
2. Reactivar churn total — *alta*
3. Proteger clientes de alto valor en riesgo — *crítica*
4. Recompras vencidas — *crítica*
5. Recordatorios preventivos — *alta*
6. Investigar downgrade — *media*
7. Fidelizar recurrentes — *media*

Se añaden dos acciones que solo son posibles con el modelo generalizado:

8. **Completar afinidad incompleta** — cliente que compró parte de un grupo de afinidad y nunca el resto (compró la base pero no el complemento). *Alta.*
9. **Ventana de reingreso estacional** — categorías con estacionalidad detectada, contactando antes del pico. *Media.*

Cada acción muestra, igual que en v3: total de clientes, **contactables**, **ingreso realista** e ingreso teórico. La diferencia es de dónde sale el multiplicador (ver §9) y de dónde sale el ticket de referencia (`ticket_referencia` del pack, nunca una constante farmacéutica).

### 6.3 Pilar PROMOCIONAR — Búsqueda de clientes para un producto

Módulo: Generador de Ofertas (wizard de 4 pasos). Se conserva el flujo completo de v3 y se rehace el **motor de scoring**.

#### 6.3.1 Scoring 0–100 generalizado

| Señal | Puntos | Cambio vs v3 |
|---|---|---|
| Compró el SKU exacto antes | +50 base, +5 por repetición (cap 25) | Igual |
| Tiene recompra pendiente de ese SKU | +30 | Igual |
| Compra en la misma **categoría** | +20 base, +2 por compra (cap 15) | Antes: categoría terapéutica |
| Compra en el mismo **grupo de afinidad** | +5, +1 por compra (cap 10) | Antes: tratamiento |
| Es recurrente o multicomprador | +15 | Igual |
| **Afinidad por co-ocurrencia** — compró un producto con Lift ≥1.5 respecto al promocionado | **+15** | **Nuevo** |
| **Sensibilidad a promoción demostrada** — histórico de compra en periodos de descuento | **+10** | **Nuevo** |
| Está inactivo | −10 | Igual |
| **Fuera de rango de ticket** — el producto supera 3× su ticket promedio histórico | **−15** | **Nuevo** |

Las dos señales nuevas positivas hacen el motor **más fuerte, no solo más genérico**: la co-ocurrencia permite encontrar compradores probables de un producto que nunca compraron, que es exactamente el caso de uso de "me llegó inventario nuevo". La penalización por rango de ticket es indispensable al generalizar, porque los verticales fuera de farmacia tienen dispersión de precio mucho mayor.

> **Nota de implementación:** la señal de sensibilidad a promoción ya tiene sustrato en `perfil_cliente_dinamico.price_sensitivity`, alimentada por el Vendedor IA. No requiere infraestructura nueva.

Se conserva el matching robusto de v3 (código exacto primero, fuzzy solo en tokens ≥5 caracteres), la auto-selección de contactables y la confirmación obligatoria sobre 20 destinatarios.

#### 6.3.2 Plantillas de mensaje

Se conserva el template editable con `{{nombre}}` sanitizado por `safeName()`. Se añade:
- Biblioteca de plantillas por pack y por tipo de acción.
- Generación de variantes con LLM y **selección por desempeño** (qué plantilla convierte mejor, medida por el módulo de atribución).
- Validación de longitud y de política de mensajería de WhatsApp antes del envío.

### 6.4 Pilar EXPLICAR — Inteligencia de negocio

Módulos conservados sin cambio conceptual, todos ya genéricos:

| Módulo | Estado en v4 |
|---|---|
| Resumen ejecutivo (`/`) | Igual; KPIs por margen si hay `costo_unitario` |
| Venta cruzada (`/cruzada`) | Igual — market basket es agnóstico. Tabs: Productos / Combos / Categorías |
| Clientes (`/clientes`, antes `/vip`) | Igual, 6 tipos renombrados a vocabulario genérico |
| Productos gancho (`/gancho`) | Igual — el análisis de atracción/arrastre no tiene supuesto sectorial |
| Cotizador (`/cotizador`) | Competidores configurables por tenant |
| Copiloto IA | Igual — chat sobre los datos del tenant |
| Comisiones (`/comisiones`) | Igual, con atribución multi-tenant |

Tipos de cliente renombrados: `recurrente_sku`, `recurrente_categoria`, `recurrente_afinidad`, `frecuente_multicomprador`, `ocasional`, `inactivo`.

---

## 7. ARQUITECTURA TÉCNICA v4.0

### 7.1 Cambios de stack

| Capa | v3.0 (PRD original) | Estado real Julio 2026 | Meta v4.0 |
|---|---|---|---|
| Datos analíticos | JSON estáticos | ✅ **PostgreSQL (Neon)**, driver `postgres` 3.4.9 | Igual + RLS |
| CRM conversacional | Redis (Upstash) | ✅ **PostgreSQL** (`conversations`, `chat_messages`, `orders`) | Igual, Redis como caché de estado en vivo |
| Aislamiento | Ninguno | ⚠️ `tenant_id` en todas las tablas, **sin RLS** | **RLS obligatorio** por `tenant_id` |
| Sesión | JWT sin tenant | ⚠️ `DEFAULT_TENANT_ID` por env var | `tenant_id` + `rol` en el claim |
| ETL | Scripts locales | ⚠️ Scripts `.mjs` + `classification_queue` async | **Jobs asíncronos** (Inngest o Trigger.dev) por tenant |
| Clasificación | Script batch | ✅ Cola con reintentos + caché global | Igual + prompt desde pack + 2 pasadas |
| WhatsApp | Twilio Sandbox | ❌ Sigue en sandbox | **Meta WhatsApp Cloud API** (Twilio como fallback) |
| LLM | Gemini 2.5 Flash | Gemini 2.5 Flash directo | Capa de abstracción de proveedor |
| Frontend | Next.js 14 App Router | Igual | Igual — no hay razón para tocarlo |
| Ontología | Terapéutica hardcoded | ❌ Sigue hardcoded en esquema y 23 archivos | **Vertical Packs** |

### 7.2 Modelo de tenancy

- Base de datos compartida, esquema compartido, **RLS obligatorio en todas las tablas** por `tenant_id`.
- Toda query de servidor pasa por un cliente que inyecta `tenant_id` desde la sesión. Nunca desde parámetro de request.
- **Excepción documentada:** `productos_master` es intencionalmente global (caché de clasificación entre tenants) y no lleva `tenant_id`. No contiene PII ni precios — solo taxonomía de producto. Es la única tabla exenta de RLS, y esa exención debe quedar comentada en la migración para que no se lea como un olvido.
- Assets y exports de cada tenant en bucket con prefijo por tenant y URLs firmadas de corta vida.
- Job de ETL aislado por tenant, con cola y límite de concurrencia.

### 7.3 Roles

| Rol | Alcance |
|---|---|
| `owner` | Todo el tenant, facturación, configuración de pack |
| `admin` | Todos los módulos operativos |
| `agente` | Inbox + búsqueda de clientes + venta cruzada (evoluciona de `cajero`) |
| `analista` | Solo lectura de dashboards |
| `nextaitech` | Cross-tenant: comisiones, atribución, salud de la plataforma |

### 7.4 Seguridad

Se conservan todas las medidas de v3 (JWT HttpOnly + SameSite, expiración 8h, HTTPS, rate limiting en login, PII fuera del repo) y se añaden:

- RLS como defensa primaria, no la sesión.
- Firma de webhook de Meta/Twilio verificada obligatoriamente — el webhook es el único endpoint sin auth.
- Retención configurable de conversaciones por tenant y export/borrado a solicitud (Ley 1581 de 2012 en Colombia).
- Registro de auditoría de envíos masivos: quién, a cuántos, con qué plantilla, cuándo. La tabla `audit_log` ya existe y soporta esto.
- Secretos por tenant (API keys de WhatsApp) cifrados en reposo, nunca en variables de entorno globales.

---

## 8. FEATURE FLAGS POR VERTICAL

| Módulo | Farmacia | Pet Shop | Cosmética | Licorera | Ferretería | Repuestos | B2B |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Agente conversacional | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Venta cruzada | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Churn multinivel | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ |
| Predicción de recompra | ✅ | ✅ | ✅ | ✅ | ⚠️ | ❌ | ✅ |
| Postventa de durables | ❌ | ⚠️ | ❌ | ❌ | ✅ | ✅ | ⚠️ |
| Captura visual | ✅ receta | ✅ | ✅ | ⚠️ | ✅ plano | ✅ placa | ✅ orden |
| Comparador de competencia | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ❌ |
| Productos gancho | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| Estacionalidad | ⚠️ | ❌ | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| Lista de precios por cliente | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ | ✅ |

✅ core · ⚠️ requiere calibración específica · ❌ deshabilitado

---

## 9. CALIBRACIÓN DE TASAS DE CONVERSIÓN — SISTEMA DE TRES NIVELES

Este es el cambio de mayor impacto en credibilidad del producto.

### 9.1 El problema

En v3, `CONVERSION` (`actions/route.ts:17`) contiene 8 tasas fijas (35%, 15%, 25%, 55%, 70%, 40%, 20%) descritas como "benchmarks del sector farmacéutico". Esas tasas multiplican la cantidad de clientes contactables y producen el **ingreso realista** que el dueño usa para decidir a quién contactar y cuánto inventario pedir. Al horizontalizar, aplicar 70% de conversión de reposición a una ferretería no es una aproximación: es una cifra inventada presentada como dato.

**El mismo problema, agravado, en el ticket:** `DEFAULT_PHARMACY_TICKET = 85000` y `DEFAULT_REPO_TICKET = 55000` se usan como fallback cuando falta historial. Un pet shop con ticket real de $35.000 vería proyecciones infladas 2.4×. Estas dos constantes se mueven a `ticket_referencia` del pack y, cuando hay datos, se calculan del historial real del tenant.

### 9.2 La solución

| Nivel | Fuente | Cuándo aplica | Cómo se muestra en UI |
|---|---|---|---|
| **T1 — Global conservador** | Priors conservadores del Pack 000 | Tenant nuevo sin pack asignado | Badge gris: *"Estimación general"* |
| **T2 — Prior del vertical** | `conversion_prior` del pack | Pack asignado, < 50 eventos de atribución | Badge azul: *"Referencia del sector"* |
| **T3 — Calibrado con tus datos** | Atribución real del tenant, con contracción bayesiana hacia el prior del pack | ≥ 50 eventos de atribución para esa acción | Badge verde: *"Calibrado con tus datos (n=143)"* |

La contracción bayesiana evita que 3 conversiones afortunadas produzcan un 100% de tasa. Con `n` bajo, la estimación se acerca al prior; a medida que crece, domina la evidencia del tenant.

**Fórmula:** posterior Beta-Binomial con el prior del pack como pseudo-conteos.
`tasa = (conversiones + prior × k) / (contactados + k)`, con `k = 50` como fuerza del prior.
Con n=0 la tasa es exactamente el prior; con n=500 el prior pesa 9%.

La tabla `attributions` ya registra los eventos necesarios (`message_id`, `fecha_mensaje`, `fecha_compra`, `valor_venta`). No requiere instrumentación nueva — solo agregación por tipo de campaña.

### 9.3 Requisitos de producto

- La UI **siempre** muestra el badge de procedencia junto a cualquier cifra de ingreso proyectado. Nunca un número sin su origen.
- El detalle de cálculo es expandible: clientes totales → contactables → tasa aplicada → ingreso.
- El dueño puede sobrescribir la tasa manualmente; queda marcada como *"Ajustada por ti"*.
- El sistema **nunca** presenta el ingreso teórico (contacto al 100%) como cifra principal.
- Estas tasas y el scoring requieren **tests unitarios** — es la única lógica del producto cuyo error se traduce directamente en decisiones de compra equivocadas del cliente.

---

## 10. ONBOARDING SELF-SERVE

Meta: de registro a primer insight en **menos de 30 minutos**, sin intervención de Next AI Tech.

| Paso | Acción | Tiempo |
|---|---|---|
| 1 | Registro y creación de tenant | 2 min |
| 2 | Selección de vertical (o Genérico) | 1 min |
| 3 | Carga del export del POS | 3 min |
| 4 | Mapeo asistido de columnas + validación de suficiencia | 5 min |
| 5 | ETL asíncrono (con barra de progreso y resultados parciales) | 5–15 min |
| 6 | Revisión y aprobación de la taxonomía propuesta (HITL) | 5 min |
| 7 | Perfil del negocio: nombre, tono, horarios, políticas, competidores | 5 min |
| 8 | Conexión de WhatsApp (Meta Embedded Signup) | 5 min |
| 9 | Aterrizaje en Next Best Action con acciones reales listas | — |

**El paso 9 es el momento de valor.** El primer contacto del usuario con el producto debe ser una lista concreta de clientes recuperables con su ingreso estimado, no un dashboard vacío.

---

## 11. PLAN DE MIGRACIÓN v3.x → v4.0

El producto está en producción. La migración es incremental y no debe romper al cliente actual.

### Fase A — Cimientos ✅ **MAYORMENTE COMPLETADA**

| # | Tarea | Estado |
|---|---|---|
| 1 | Modelar esquema Postgres con `tenant_id` | ✅ Hecho — `001_initial_schema.sql`, 16 tablas |
| 2 | Migrar los datasets JSON a tablas manteniendo la API de `dataService` | ✅ Hecho — `dataServiceDb.ts` |
| 3 | Migrar el CRM de Redis a Postgres | ✅ Hecho — `conversations`, `chat_messages`, `orders` |
| 4 | Crear el tenant `superofertas` y cargar sus datos | ✅ Hecho — `seed-from-existing.mjs` |
| 5 | **RLS por `tenant_id` en todas las tablas** (excepto `productos_master`) | ❌ **Pendiente** |
| 6 | **`tenant_id` y `rol` en el claim JWT**, eliminar dependencia de `DEFAULT_TENANT_ID` | ❌ **Pendiente** |
| 7 | **Auditoría de queries**: verificar que ninguna omita `tenant_id` antes de activar RLS | ❌ **Pendiente** |

**Criterio de salida:** ningún tenant puede leer datos de otro aunque una query omita el filtro.

### Fase B — Ontología 🔜 **EN CURSO**

| # | Tarea |
|---|---|
| 8 | Migración `002`: renombrar `categoria_terapeutica`→`categoria`, `tratamiento`→`afinidad`, `tipo_tratamiento`→`tipo_afinidad`, `es_cronico`→`es_ancla`, `es_receta`→`requiere_autorizacion`, `principio_activo`→`atributo_clave`, `categoria_atc`→`codigo_externo` |
| 9 | Vista `productos_master_v3` con los nombres antiguos para compatibilidad — el código existente no se toca en este paso |
| 10 | Tabla `vertical_packs` + columna `tenants.pack_id` |
| 11 | Seed del **Pack 001 – Farmacia** reproduciendo exactamente el comportamiento actual, y del **Pack 000 – Genérico** |
| 12 | `src/lib/packs.ts`: loader con caché que resuelve el pack del tenant |
| 13 | Migrar los 23 archivos a los nombres nuevos, uno por uno, con la vista como red de seguridad |
| 14 | Eliminar la vista de compatibilidad |

**Criterio de salida:** el tenant de farmacia produce resultados idénticos con la ontología genérica cargada desde el pack.

> *Este es el punto de validación crítico de toda la refactorización: si el Pack 001 no reproduce el comportamiento actual exactamente, la abstracción es incorrecta.*

### Fase C — Calibración

| # | Tarea |
|---|---|
| 15 | Sistema de tres niveles de conversión con contracción bayesiana |
| 16 | Badges de procedencia en UI + detalle de cálculo expandible |
| 17 | Mover `DEFAULT_PHARMACY_TICKET` / `DEFAULT_REPO_TICKET` a `ticket_referencia` del pack |
| 18 | Tests unitarios de scoring y conversión (cobertura ≥ 80%) |
| 19 | Parametrizar umbrales de recompra y churn desde el pack |

### Fase D — Motor generalizado

| # | Tarea |
|---|---|
| 20 | Nuevas señales de scoring (co-ocurrencia, sensibilidad a promoción, rango de ticket) |
| 21 | Flag consumible/durable + módulo de postventa |
| 22 | Captura de demanda visual multi-modo |
| 23 | Ciclo por categoría y ajuste por cantidad en recompra |
| 24 | Columnas canónicas faltantes en `ventas` (`precio_unitario`, `costo_unitario`, `canal`, `vendedor_id`, `sucursal_id`) |
| 25 | Renombrar `cedula` → `cliente_id` (deuda técnica de §4.1) |

### Fase E — Multi-tenant real

| # | Tarea |
|---|---|
| 26 | Mapeador inteligente de columnas |
| 27 | ETL asíncrono por tenant |
| 28 | Meta WhatsApp Cloud API con Embedded Signup |
| 29 | Onboarding self-serve completo |
| 30 | Segundo tenant en vertical distinto (**Pack 002 – Pet Shop**) |

**Hito de validación del reposicionamiento:** un pet shop completa el onboarding sin asistencia y llega a su primera acción accionable. Hasta que eso ocurra, el producto sigue siendo vertical.

---

## 12. ROADMAP

| Fase | Contenido | Estado |
|---|---|---|
| 1–4 | MVP → producción vertical farmacia | ✅ Completada (Abril 2026) |
| 4.5 | Migración a Postgres multi-tenant | ✅ Completada (Mayo 2026) |
| **5** | **Cierre de cimientos + Ontología + Calibración** (Fases A′–C) | 🔜 En curso |
| **6** | **Motor generalizado + Onboarding self-serve** (Fases D–E) | Planeada |
| 7 | Pasarela de pago real (Wompi, Nequi, Mercado Pago) | Planeada |
| 8 | Conectores POS directos (Siesa, Helisa, World Office, Alegra) | Planeada |
| 9 | Packs 003–005 + app móvil para agentes + PWA | Planeada |
| 10 | Packs 006–008 (ferretería, repuestos, B2B) | Exploratoria |

---

## 13. MÉTRICAS DE ÉXITO

### 13.1 De producto (valor entregado al cliente)

| Métrica | Meta |
|---|---|
| Ingreso atribuido a acciones de Sellix / mes | ≥ 8× el precio de la suscripción |
| Tasa de conversión de campañas de recuperación | ≥ prior del vertical |
| Conversaciones resueltas sin humano | ≥ 60% |
| Tiempo de respuesta del agente | < 5 s |
| Precisión del matching de catálogo | ≥ 97% |
| Cobertura de clasificación del catálogo | ≥ 98% |

### 13.2 De horizontalidad (valida el reposicionamiento)

| Métrica | Meta |
|---|---|
| Tiempo de onboarding sin asistencia | < 30 min |
| Tiempo de creación de un nuevo Vertical Pack | < 3 días, **cero cambios en el Core** |
| Verticales distintos en producción | ≥ 3 al cierre de Fase 6 |
| Líneas de código específicas de vertical en el Core | **0** |

La última métrica es la definición operativa de éxito de este PRD. Hoy el valor es ~23 archivos; el objetivo es 0.

### 13.3 Técnicas

| Métrica | Meta |
|---|---|
| Bundle JS compartido | < 100 KB (v3: 87.4 KB) |
| Edge middleware | < 100 KB (v3: 77 KB) |
| Carga de dashboard con 5.000 clientes | < 3 s |
| Duración del ETL para 50.000 transacciones | < 10 min |
| Cobertura de tests en scoring y conversión | ≥ 80% (hoy: 0%) |

---

## 14. RIESGOS Y DECISIONES ABIERTAS

### 14.1 Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Generalizar diluye la calidad del vertical validado | Alto | Fase B exige reproducción exacta del comportamiento actual antes de avanzar |
| Volumen insuficiente de datos en tenants nuevos → recomendaciones pobres | Alto | Validación bloqueante en onboarding; degradar módulos explícitamente en vez de mostrar cifras débiles |
| **Activar RLS rompe queries que hoy omiten `tenant_id`** | **Alto** | Auditar las queries de `dataServiceDb.ts` antes de activar; desplegar RLS primero en modo permisivo con logging |
| Caché de clasificación cruzada entre packs contamina taxonomías | Medio | Segmentar `productos_master` por `pack_id` — un código clasificado como farmacéutico no sirve a un pet shop |
| Costo de LLM por tenant al clasificar catálogos grandes | Bajo | **Ya mitigado** por `productos_master` global + clasificación en dos pasadas |
| Restricciones de plantillas de Meta para mensajería saliente | **Alto** | Biblioteca de plantillas pre-aprobadas por pack; diseñar campañas dentro de la ventana de 24h cuando sea posible |
| Percepción de spam en campañas masivas | Alto | Límites de frecuencia por cliente, opt-out obligatorio, confirmación sobre 20 destinatarios (ya en v3) |
| Cumplimiento de habeas data en múltiples verticales | Medio | Retención configurable, export y borrado por solicitud, consentimiento registrado |

### 14.2 Decisiones abiertas

1. **¿Un solo producto o dos SKUs comerciales?** Sellix "Vender" (agente + inbox) y Sellix "Inteligencia" (analytics) podrían venderse separados, con precio de entrada más bajo. Requiere definición antes de Fase 6.
2. **¿Modelo de precio?** Por asiento, por conversación, por cliente en base, o por ingreso atribuido. El módulo de atribución ya existente habilita el último, que es el más alineado con el valor — y el más difícil de operar.
3. **¿Los Vertical Packs son abiertos?** Permitir que un integrador cree packs convierte a Sellix en plataforma, pero exige versionado, validación y soporte del esquema de pack.
4. **¿El Pack 008 – B2B es el mismo producto?** Lista de precios por cliente, crédito y ciclos de orden cambian el modelo de datos lo suficiente como para evaluarlo como producto separado.
5. **¿`productos_master` global o por pack?** Compartir clasificaciones entre tenants ahorra costo de LLM, pero mezcla taxonomías si dos packs clasifican el mismo código de forma distinta. La propuesta actual es segmentar por `pack_id`, lo que reduce el ahorro pero preserva la corrección.

---

## 15. ANEXO — PACK 001: FARMACIA (PRESERVACIÓN DEL v3.0)

Todo el trabajo de v3.0 se conserva como configuración, no como código:

| Activo de v3.0 | Destino en v4.0 |
|---|---|
| Taxonomía terapéutica de 2.870 productos | Taxonomía semilla del Pack 001 (ya en `productos_master`) |
| Prompt terapéutico de `classification/process` | `clasificador_prompt` del Pack 001 |
| Tasas de conversión farmacéuticas (8 valores) | `conversion_prior` del Pack 001 (nivel T2) |
| `DEFAULT_PHARMACY_TICKET` / `DEFAULT_REPO_TICKET` | `ticket_referencia` del Pack 001 |
| Filtros de recompra (3 compras, CV ≤ 0.6, 120d) | `recompra` del Pack 001 |
| `prescriptionAnalyzer` | Modo `receta` de Captura Visual, Pack 001 |
| Competidores (Cruz Verde, Farmatodo, La Rebaja, Olímpica) | `competidores_referencia` del Pack 001 |
| Tipos `churn_tratamiento` / `churn_cronico` | `abandono_afinidad` / `abandono_ancla` + `items_ancla` |
| Los 11 fixes del code review v3 | Migran al Core sin cambios |
| Droguería Super Ofertas | Tenant `superofertas` — referencia y caso de validación del pack |

**Ninguna capacidad del v3.0 se pierde.** Cada una se convierte en la demostración de que un vertical puede expresarse íntegramente como configuración sobre el Core.

---

*Documento preparado por Next AI Tech LLC · Miami, Florida*
*Sellix AI v4.0 · Julio 2026*
*Producción actual: https://sellix-ai.com*
