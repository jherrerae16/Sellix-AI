// =============================================================
// Sellix AI — Prescription Analyzer
// Uses Gemini Vision to read prescription photos and extract
// medication names, then matches them against our product catalog.
// =============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";
import { readFile } from "fs/promises";
import { join } from "path";

interface DetectedProduct {
  nombre_receta: string;       // What was written on the prescription
  nombre_catalogo: string | null; // Matched product from our catalog
  codigo: string | null;
  precio_unidad: number | null;
  precio_caja: number | null;
  match_confidence: "exacto" | "similar" | "no_encontrado";
}

interface PrescriptionResult {
  success: boolean;
  productos: DetectedProduct[];
  total_estimado: number;
  mensaje_cliente: string;
  error?: string;
}

interface CatalogEntry {
  codigo: string;
  nombre: string;
  precio_unidad: number;
  precio_caja: number;
  transacciones: number;
}

async function loadCatalog(): Promise<CatalogEntry[]> {
  try {
    const raw = await readFile(join(process.cwd(), "data", "output", "precios_catalogo.json"), "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function findInCatalog(name: string, catalog: CatalogEntry[]): {
  entry: CatalogEntry | null;
  confidence: "exacto" | "similar" | "no_encontrado";
} {
  const q = name.toLowerCase().replace(/[^a-záéíóúñ0-9\s]/gi, "").trim();
  const words = q.split(/\s+/).filter((w) => w.length > 2);

  // Exact match
  const exact = catalog.find((p) =>
    p.nombre.toLowerCase().includes(q)
  );
  if (exact) return { entry: exact, confidence: "exacto" };

  // Fuzzy: all words must match
  const fuzzy = catalog.find((p) => {
    const pName = p.nombre.toLowerCase();
    return words.every((w) => pName.includes(w));
  });
  if (fuzzy) return { entry: fuzzy, confidence: "exacto" };

  // Partial: first word (usually the drug name) + any dosage word
  if (words.length >= 1) {
    const mainWord = words[0];
    const matches = catalog.filter((p) =>
      p.nombre.toLowerCase().includes(mainWord)
    );

    if (matches.length > 0) {
      // Prefer match with dosage
      const dosageWord = words.find((w) => /\d/.test(w));
      if (dosageWord) {
        const withDosage = matches.find((p) =>
          p.nombre.toLowerCase().includes(dosageWord)
        );
        if (withDosage) return { entry: withDosage, confidence: "exacto" };
      }
      // Return most sold match
      matches.sort((a, b) => b.transacciones - a.transacciones);
      return { entry: matches[0], confidence: "similar" };
    }
  }

  return { entry: null, confidence: "no_encontrado" };
}

export async function analyzePrescription(imageUrl: string): Promise<PrescriptionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      productos: [],
      total_estimado: 0,
      mensaje_cliente: "El análisis de recetas no está configurado.",
      error: "GEMINI_API_KEY not set",
    };
  }

  try {
    // 1. Download image from Twilio URL (needs auth)
    const twilioSid = process.env.TWILIO_ACCOUNT_SID || "";
    const twilioToken = process.env.TWILIO_AUTH_TOKEN || "";
    const authHeader = "Basic " + Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");

    const imgResponse = await fetch(imageUrl, {
      headers: { Authorization: authHeader },
    });
    if (!imgResponse.ok) {
      return {
        success: false,
        productos: [],
        total_estimado: 0,
        mensaje_cliente: "No pude acceder a la imagen. Intente enviarla de nuevo.",
        error: `Image fetch failed: ${imgResponse.status}`,
      };
    }

    const imgBuffer = await imgResponse.arrayBuffer();
    const base64Image = Buffer.from(imgBuffer).toString("base64");
    const mimeType = imgResponse.headers.get("content-type") || "image/jpeg";

    // 2. Send to Gemini Vision
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType,
        },
      },
      {
        text: `Analiza esta imagen de una receta médica o fórmula farmacéutica colombiana.
Extrae TODOS los medicamentos que puedas leer, incluyendo:
- Nombre del medicamento
- Dosis (mg, ml, etc.)
- Presentación si es visible (tabletas, cápsulas, jarabe, etc.)
- Cantidad si se indica

Responde SOLO con un JSON array, sin markdown ni backticks:
[{"nombre": "nombre completo del medicamento con dosis", "cantidad": numero_o_1_si_no_dice}]

Si la imagen no es una receta o no puedes leer nada, responde: []
No inventes medicamentos que no puedas leer claramente.`,
      },
    ]);

    const responseText = result.response.text()
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let detected: { nombre: string; cantidad: number }[];
    try {
      detected = JSON.parse(responseText);
    } catch {
      return {
        success: false,
        productos: [],
        total_estimado: 0,
        mensaje_cliente: "No pude leer los medicamentos de la receta. ¿Puede enviar una foto más clara?",
        error: `Parse error: ${responseText.slice(0, 100)}`,
      };
    }

    if (!Array.isArray(detected) || detected.length === 0) {
      return {
        success: false,
        productos: [],
        total_estimado: 0,
        mensaje_cliente: "No encontré medicamentos en la imagen. Asegúrese de que sea una receta médica y envíe una foto clara.",
      };
    }

    // 3. Match against catalog
    const catalog = await loadCatalog();
    const productos: DetectedProduct[] = [];
    let total = 0;

    for (const item of detected) {
      const { entry, confidence } = findInCatalog(item.nombre, catalog);

      const product: DetectedProduct = {
        nombre_receta: item.nombre,
        nombre_catalogo: entry?.nombre || null,
        codigo: entry?.codigo || null,
        precio_unidad: entry?.precio_unidad || null,
        precio_caja: entry?.precio_caja || null,
        match_confidence: confidence,
      };

      if (entry && entry.precio_caja > 0) {
        total += entry.precio_caja * (item.cantidad || 1);
      } else if (entry && entry.precio_unidad > 0) {
        total += entry.precio_unidad * (item.cantidad || 1);
      }

      productos.push(product);
    }

    // 4. Build WhatsApp message
    const found = productos.filter((p) => p.match_confidence !== "no_encontrado");
    const notFound = productos.filter((p) => p.match_confidence === "no_encontrado");

    let mensaje = `📋 *Receta analizada* — ${productos.length} medicamento(s) detectado(s)\n\n`;

    if (found.length > 0) {
      mensaje += `✅ *Disponibles en nuestra droguería:*\n`;
      for (const p of found) {
        const precio = p.precio_caja || p.precio_unidad || 0;
        mensaje += `\n• *${p.nombre_catalogo}*\n`;
        mensaje += `  Precio: $${precio.toLocaleString("es-CO")}`;
        if (p.match_confidence === "similar") {
          mensaje += ` (producto similar)`;
        }
        mensaje += `\n`;
      }
      mensaje += `\n💰 *Total estimado: $${total.toLocaleString("es-CO")}*\n`;
    }

    if (notFound.length > 0) {
      mensaje += `\n⚠️ *No encontrados en catálogo:*\n`;
      for (const p of notFound) {
        mensaje += `• ${p.nombre_receta}\n`;
      }
    }

    mensaje += `\n¿Desea hacer el pedido? Responda *SÍ* y se lo preparamos.\n\nDroguería Super Ofertas 💊`;

    return {
      success: true,
      productos,
      total_estimado: total,
      mensaje_cliente: mensaje,
    };
  } catch (err) {
    console.error("Prescription analysis error:", err);
    return {
      success: false,
      productos: [],
      total_estimado: 0,
      mensaje_cliente: "Hubo un error analizando la receta. Intente de nuevo o escriba los nombres de los medicamentos.",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
