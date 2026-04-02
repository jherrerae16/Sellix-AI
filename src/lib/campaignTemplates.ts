// =============================================================
// Sellix AI — Plantillas de campañas
// Tono: colombiano profesional, farmacéutico, cálido
// Placeholders: {{nombre}}, {{producto}}, {{proxima_reposicion}},
//               {{dias_sin_comprar}}, {{ciclo_dias}}, {{estado}}
// =============================================================

import type { CampaignTemplate } from "./types";

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  // ── Reposición ──────────────────────────────────────────────
  {
    id: "repo-recordatorio",
    name: "Recordatorio de reposición",
    type: "reposicion",
    subject: "{{nombre}}, es hora de reponer su {{producto}}",
    body: `Cordial saludo {{nombre}},

Le escribimos desde su droguería de confianza para recordarle que es momento de reponer su {{producto}}.

Según su historial de compras, usted adquiere este producto aproximadamente cada {{ciclo_dias}} días y su próxima reposición está estimada para el {{proxima_reposicion}}.

No espere a quedarse sin su medicamento. Pase por nuestra droguería o contáctenos y se lo tenemos listo.

Con gusto le atendemos,
Droguería Super Ofertas
Su salud, nuestra prioridad`,
  },
  {
    id: "repo-vencido",
    name: "Reposición vencida - Contacto urgente",
    type: "reposicion",
    subject: "{{nombre}}, su {{producto}} necesita reposición urgente",
    body: `Estimado/a {{nombre}},

Nos permitimos contactarle porque según nuestros registros, su {{producto}} ya debió haberse repuesto.

Sabemos lo importante que es para su salud mantener la continuidad de su tratamiento. Queremos asegurarnos de que no se quede sin su medicamento.

Si desea, podemos tenerle su producto reservado para cuando pueda pasar a recogerlo. Solo responda este mensaje o llámenos.

Estamos para servirle,
Droguería Super Ofertas
Su salud, nuestra prioridad`,
  },

  // ── Churn / Recuperación ────────────────────────────────────
  {
    id: "churn-reactivacion",
    name: "Reactivación de cliente",
    type: "churn",
    subject: "{{nombre}}, lo extrañamos en Droguería Super Ofertas",
    body: `Cordial saludo {{nombre}},

Hace {{dias_sin_comprar}} días que no nos visita y queremos saber cómo está. En Droguería Super Ofertas siempre tenemos los mejores precios y la atención personalizada que usted merece.

Le recordamos que contamos con servicio a domicilio para su comodidad. Si necesita algún medicamento o producto de salud, estamos a una llamada de distancia.

Lo esperamos con gusto,
Droguería Super Ofertas
Su salud, nuestra prioridad`,
  },
  {
    id: "churn-oferta",
    name: "Oferta especial para cliente inactivo",
    type: "churn",
    subject: "{{nombre}}, tenemos algo especial para usted",
    body: `Estimado/a {{nombre}},

Como cliente valioso de nuestra droguería, queremos ofrecerle una atención preferencial en su próxima visita.

Sabemos que han pasado {{dias_sin_comprar}} días desde su última compra y queremos darle un motivo para volver. Pregúntenos por nuestra promoción especial para clientes frecuentes.

Pase por la droguería o escríbanos por WhatsApp. Será un gusto atenderle de nuevo.

Un abrazo,
Droguería Super Ofertas
Su salud, nuestra prioridad`,
  },
];
