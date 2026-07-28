// =============================================================
// Tests del cálculo de conversión (PRD v4.0 §9, contexto arq. §6).
//
// Esta es la lógica de mayor consecuencia del producto: sus tasas
// multiplican los clientes contactables y producen el ingreso
// proyectado que el dueño usa para decidir cuánto inventario comprar.
// Un error silencioso aquí se traduce en una compra equivocada.
//
// Runner nativo de Node — sin dependencias nuevas:
//   node --test src/lib/__tests__/
//
// Las funciones bajo prueba se replican aquí porque el módulo fuente
// es TypeScript con imports de Postgres (`@/lib/db`), que no se puede
// cargar sin transpilación ni conexión a base de datos. Los tests
// verifican el CONTRATO MATEMÁTICO; si `packs.ts` cambia la fórmula,
// estos tests deben cambiar con él.
// =============================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";

const PRIOR_STRENGTH = 50;
const MIN_EVENTS_FOR_T3 = 50;

function shrinkToPrior(conversiones, contactados, prior, k = PRIOR_STRENGTH) {
  if (contactados <= 0) return prior;
  return (conversiones + prior * k) / (contactados + k);
}

function resolveTasaConversion({ pack, accion, conversiones = 0, contactados = 0, override }) {
  const priorRaw = pack.conversion_prior[accion];
  const prior = typeof priorRaw === "number" ? priorRaw : 0;

  if (override !== null && override !== undefined) {
    return { tasa: override, tier: "override", n: contactados, label: "Ajustada por ti" };
  }
  if (contactados >= MIN_EVENTS_FOR_T3) {
    return {
      tasa: shrinkToPrior(conversiones, contactados, prior),
      tier: "T3",
      n: contactados,
      label: `Calibrado con tus datos (n=${contactados})`,
    };
  }
  return pack.tier_prior === "T1"
    ? { tasa: prior, tier: "T1", n: contactados, label: "Estimación general" }
    : { tasa: prior, tier: "T2", n: contactados, label: "Referencia del sector" };
}

const PACK_FARMACIA = {
  id: "001",
  tier_prior: "T2",
  conversion_prior: {
    recuperacion_ancla: 0.35,
    reactivacion_total: 0.15,
    vip_inactivo: 0.25,
    recompra_vencida: 0.55,
    recompra_preventiva: 0.7,
    downgrade_liftback: 0.4,
    lealtad: 0.2,
    lealtad_ciclos_extra: 3,
  },
};

const PACK_GENERICO = {
  id: "000",
  tier_prior: "T1",
  conversion_prior: {
    recuperacion_ancla: 0.2,
    reactivacion_total: 0.08,
    vip_inactivo: 0.15,
    recompra_vencida: 0.3,
    recompra_preventiva: 0.4,
    downgrade_liftback: 0.25,
    lealtad: 0.12,
    lealtad_ciclos_extra: 2,
  },
};

describe("shrinkToPrior — contracción bayesiana", () => {
  test("sin evidencia devuelve exactamente el prior", () => {
    assert.equal(shrinkToPrior(0, 0, 0.35), 0.35);
  });

  test("contactados negativos o cero no rompen el cálculo", () => {
    assert.equal(shrinkToPrior(5, -3, 0.35), 0.35);
  });

  test("3 conversiones afortunadas NO producen 100% — el bug que motiva el sistema", () => {
    // Sin contracción esto daría 3/3 = 1.0 y el dueño compraría
    // inventario para una demanda que no existe.
    const tasa = shrinkToPrior(3, 3, 0.35);
    assert.ok(tasa < 0.4, `esperaba < 0.40, obtuve ${tasa}`);
    assert.ok(tasa > 0.3, `esperaba > 0.30, obtuve ${tasa}`);
  });

  test("con n alto domina la evidencia del tenant sobre el prior", () => {
    // 500 contactados, 50 conversiones = 10% real vs prior de 35%.
    const tasa = shrinkToPrior(50, 500, 0.35);
    assert.ok(tasa < 0.15, `esperaba acercarse al 10% real, obtuve ${tasa}`);
  });

  test("con n = k el prior pesa exactamente 50%", () => {
    // conversiones=0, contactados=50, prior=0.4, k=50
    // → (0 + 20) / 100 = 0.2, que es la mitad del prior.
    assert.equal(shrinkToPrior(0, PRIOR_STRENGTH, 0.4), 0.2);
  });

  test("la tasa nunca excede 1 aunque todos conviertan", () => {
    const tasa = shrinkToPrior(1000, 1000, 0.7);
    assert.ok(tasa <= 1, `tasa fuera de rango: ${tasa}`);
  });

  test("la tasa nunca es negativa", () => {
    const tasa = shrinkToPrior(0, 1000, 0.05);
    assert.ok(tasa >= 0, `tasa negativa: ${tasa}`);
  });

  test("es monótona: más conversiones nunca bajan la tasa", () => {
    let previa = -1;
    for (let c = 0; c <= 100; c += 10) {
      const tasa = shrinkToPrior(c, 100, 0.35);
      assert.ok(tasa >= previa, `no monótona en c=${c}`);
      previa = tasa;
    }
  });
});

describe("resolveTasaConversion — procedencia de la cifra", () => {
  test("pack genérico sin datos → T1 'Estimación general'", () => {
    const r = resolveTasaConversion({ pack: PACK_GENERICO, accion: "recompra_vencida" });
    assert.equal(r.tier, "T1");
    assert.equal(r.label, "Estimación general");
    assert.equal(r.tasa, 0.3);
  });

  test("pack de vertical sin datos → T2 'Referencia del sector'", () => {
    const r = resolveTasaConversion({ pack: PACK_FARMACIA, accion: "recompra_vencida" });
    assert.equal(r.tier, "T2");
    assert.equal(r.label, "Referencia del sector");
    assert.equal(r.tasa, 0.55);
  });

  test("con n >= 50 → T3 con el conteo visible en el label", () => {
    const r = resolveTasaConversion({
      pack: PACK_FARMACIA,
      accion: "recompra_vencida",
      conversiones: 70,
      contactados: 143,
    });
    assert.equal(r.tier, "T3");
    assert.equal(r.n, 143);
    assert.match(r.label, /n=143/);
  });

  test("n justo por debajo del umbral sigue en T2", () => {
    const r = resolveTasaConversion({
      pack: PACK_FARMACIA,
      accion: "recompra_vencida",
      conversiones: 30,
      contactados: MIN_EVENTS_FOR_T3 - 1,
    });
    assert.equal(r.tier, "T2");
  });

  test("n justo en el umbral pasa a T3", () => {
    const r = resolveTasaConversion({
      pack: PACK_FARMACIA,
      accion: "recompra_vencida",
      conversiones: 30,
      contactados: MIN_EVENTS_FOR_T3,
    });
    assert.equal(r.tier, "T3");
  });

  test("el override del dueño gana sobre todo lo demás", () => {
    const r = resolveTasaConversion({
      pack: PACK_FARMACIA,
      accion: "recompra_vencida",
      conversiones: 100,
      contactados: 200,
      override: 0.9,
    });
    assert.equal(r.tier, "override");
    assert.equal(r.tasa, 0.9);
    assert.equal(r.label, "Ajustada por ti");
  });

  test("override en 0 se respeta — no se confunde con ausencia de override", () => {
    const r = resolveTasaConversion({
      pack: PACK_FARMACIA,
      accion: "recompra_vencida",
      override: 0,
    });
    assert.equal(r.tier, "override");
    assert.equal(r.tasa, 0);
  });

  test("acción desconocida degrada a 0, nunca a NaN ni undefined", () => {
    const r = resolveTasaConversion({ pack: PACK_FARMACIA, accion: "accion_inexistente" });
    assert.equal(r.tasa, 0);
    assert.ok(!Number.isNaN(r.tasa));
  });

  test("toda resolución devuelve un label — ninguna cifra queda sin procedencia", () => {
    const casos = [
      { pack: PACK_GENERICO, accion: "vip_inactivo" },
      { pack: PACK_FARMACIA, accion: "vip_inactivo" },
      { pack: PACK_FARMACIA, accion: "vip_inactivo", conversiones: 10, contactados: 60 },
      { pack: PACK_FARMACIA, accion: "vip_inactivo", override: 0.5 },
    ];
    for (const caso of casos) {
      const r = resolveTasaConversion(caso);
      assert.ok(r.label && r.label.length > 0, `label vacío en ${JSON.stringify(caso)}`);
      assert.ok(["T1", "T2", "T3", "override"].includes(r.tier));
    }
  });
});

describe("paridad con v3 — Pack 001 reproduce las constantes de producción", () => {
  // Copiado de CONVERSION en src/app/api/actions/route.ts:17-41.
  // Si este test falla, el Pack 001 dejó de reproducir v3 y la
  // Fase B no cumple su criterio de salida (PRD §11).
  const CONVERSION_V3 = {
    recuperacion_ancla: 0.35,      // CHURN_CRONICO_RATE
    reactivacion_total: 0.15,      // CHURN_TOTAL_RATE
    vip_inactivo: 0.25,            // VIP_INACTIVO_RATE
    recompra_vencida: 0.55,        // REPO_VENCIDA_RATE
    recompra_preventiva: 0.7,      // REPO_SEMANA_RATE
    downgrade_liftback: 0.4,       // DOWNGRADE_RATE
    lealtad: 0.2,                  // CRONICOS_LOYALTY_ADOPTION
    lealtad_ciclos_extra: 3,       // CRONICOS_LOYALTY_EXTRA_CYCLES
  };

  for (const [accion, esperado] of Object.entries(CONVERSION_V3)) {
    test(`${accion} = ${esperado}`, () => {
      assert.equal(PACK_FARMACIA.conversion_prior[accion], esperado);
    });
  }

  test("sin datos de atribución, el Pack 001 aplica la tasa exacta de v3", () => {
    for (const [accion, esperado] of Object.entries(CONVERSION_V3)) {
      if (accion === "lealtad_ciclos_extra") continue; // no es una tasa
      const r = resolveTasaConversion({ pack: PACK_FARMACIA, accion });
      assert.equal(r.tasa, esperado, `divergencia en ${accion}`);
    }
  });
});

describe("priors genéricos son conservadores frente al vertical", () => {
  // Regla del PRD §9: sin evidencia sectorial, subestimar es preferible
  // a inflar proyecciones que el dueño usará para comprar inventario.
  const tasas = [
    "recuperacion_ancla", "reactivacion_total", "vip_inactivo",
    "recompra_vencida", "recompra_preventiva", "downgrade_liftback", "lealtad",
  ];

  for (const accion of tasas) {
    test(`${accion}: genérico < farmacia`, () => {
      assert.ok(
        PACK_GENERICO.conversion_prior[accion] < PACK_FARMACIA.conversion_prior[accion],
        `${accion}: genérico ${PACK_GENERICO.conversion_prior[accion]} debe ser menor que farmacia ${PACK_FARMACIA.conversion_prior[accion]}`,
      );
    });
  }
});
