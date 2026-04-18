// =============================================================
// Sellix AI — Classify products with Gemini
// One-time script: classifies all products in precios_catalogo.json
// into therapeutic categories (principio activo, ATC, tipo tratamiento)
// Usage: node scripts/classify-products.mjs
// =============================================================

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Load .env.local
config({ path: join(ROOT, ".env.local") });

const CATALOG_PATH = join(ROOT, "data", "output", "precios_catalogo.json");
const OUTPUT_PATH = join(ROOT, "data", "output", "productos_clasificados.json");

const BATCH_SIZE = 30;
const RETRY_DELAY_MS = 2000;

async function loadCatalog() {
  const raw = await readFile(CATALOG_PATH, "utf-8");
  return JSON.parse(raw);
}

async function loadExisting() {
  if (!existsSync(OUTPUT_PATH)) return {};
  try {
    const raw = await readFile(OUTPUT_PATH, "utf-8");
    const arr = JSON.parse(raw);
    const map = {};
    for (const item of arr) map[item.codigo] = item;
    return map;
  } catch { return {}; }
}

const CLASSIFICATION_SCHEMA = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      codigo: { type: SchemaType.STRING },
      principio_activo: {
        type: SchemaType.STRING,
        description: "Principio activo principal (ej: Losartán, Acetaminofén, Omeprazol). Si es dispositivo o no-farmacéutico, poner 'N/A'",
      },
      categoria_atc: {
        type: SchemaType.STRING,
        description: "Código ATC nivel 3-4 (ej: C09CA, N02BE, A02BC). Si no aplica, 'N/A'",
      },
      categoria_terapeutica: {
        type: SchemaType.STRING,
        description: "Categoría clínica en español (ej: Antihipertensivos, Analgésicos, Antiulcerosos, Suplementos, Dispositivo médico)",
      },
      subcategoria: {
        type: SchemaType.STRING,
        description: "Subcategoría más específica (ej: ARA-II, AINE, Inhibidores de bomba)",
      },
      tipo_tratamiento: {
        type: SchemaType.STRING,
        format: "enum",
        enum: ["cronico", "agudo", "ocasional", "preventivo", "no_aplica"],
        description: "cronico = tratamiento continuo (ej: hipertensión), agudo = corto plazo (antibióticos), ocasional = según necesidad (analgésicos), preventivo = vitaminas, no_aplica = dispositivos",
      },
      tratamiento: {
        type: SchemaType.STRING,
        description: "Condición o uso principal (ej: Hipertensión, Diabetes, Dolor, Gripe)",
      },
      es_cronico: { type: SchemaType.BOOLEAN },
      es_receta: { type: SchemaType.BOOLEAN, description: "Si requiere prescripción médica" },
    },
    required: ["codigo", "principio_activo", "categoria_terapeutica", "tipo_tratamiento", "tratamiento", "es_cronico", "es_receta"],
  },
};

async function classifyBatch(model, products, attempt = 1) {
  const prompt = `Clasifica estos productos farmacéuticos colombianos. Responde SOLO JSON según el schema.

Productos:
${products.map((p) => `- ${p.codigo}: ${p.nombre}`).join("\n")}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return JSON.parse(text);
  } catch (err) {
    if (attempt < 3) {
      console.log(`  ⚠️  Batch failed (attempt ${attempt}), retrying in ${RETRY_DELAY_MS}ms...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      return classifyBatch(model, products, attempt + 1);
    }
    console.error(`  ❌ Batch failed after 3 attempts:`, err.message);
    return [];
  }
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY not set in .env.local");
    process.exit(1);
  }

  const catalog = await loadCatalog();
  const existing = await loadExisting();
  const alreadyDone = Object.keys(existing).length;

  console.log(`📦 Catálogo: ${catalog.length} productos`);
  console.log(`✅ Ya clasificados: ${alreadyDone}`);

  const pending = catalog.filter((p) => !existing[p.codigo]);
  console.log(`🔄 Pendientes: ${pending.length}`);

  if (pending.length === 0) {
    console.log("✅ Todo clasificado. Nada que hacer.");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: CLASSIFICATION_SCHEMA,
    },
  });

  const totalBatches = Math.ceil(pending.length / BATCH_SIZE);
  let processed = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    process.stdout.write(`[${batchNum}/${totalBatches}] Clasificando ${batch.length} productos... `);
    const start = Date.now();

    const classified = await classifyBatch(model, batch);

    for (const item of classified) {
      const catalogItem = catalog.find((p) => p.codigo === item.codigo);
      existing[item.codigo] = {
        ...item,
        nombre: catalogItem?.nombre || "",
      };
      processed++;
    }

    if (classified.length === 0) {
      failed += batch.length;
    }

    console.log(`✓ ${Date.now() - start}ms (total: ${processed}, fallidos: ${failed})`);

    // Save progress every 5 batches
    if (batchNum % 5 === 0 || batchNum === totalBatches) {
      const arr = Object.values(existing);
      await writeFile(OUTPUT_PATH, JSON.stringify(arr, null, 2), "utf-8");
      console.log(`  💾 Guardado: ${arr.length} productos en productos_clasificados.json`);
    }

    // Small delay to avoid rate limits
    await new Promise((r) => setTimeout(r, 300));
  }

  // Final save
  const finalArr = Object.values(existing);
  await writeFile(OUTPUT_PATH, JSON.stringify(finalArr, null, 2), "utf-8");

  console.log("\n✅ COMPLETADO");
  console.log(`   Total clasificados: ${finalArr.length}`);
  console.log(`   Fallidos: ${failed}`);
  console.log(`   Archivo: ${OUTPUT_PATH}`);

  // Stats
  const categorias = {};
  const tratamientos = {};
  const cronicos = finalArr.filter((p) => p.es_cronico).length;

  for (const p of finalArr) {
    categorias[p.categoria_terapeutica] = (categorias[p.categoria_terapeutica] || 0) + 1;
    tratamientos[p.tratamiento] = (tratamientos[p.tratamiento] || 0) + 1;
  }

  console.log(`\n📊 Estadísticas:`);
  console.log(`   Crónicos: ${cronicos} (${Math.round(cronicos / finalArr.length * 100)}%)`);
  console.log(`   Categorías únicas: ${Object.keys(categorias).length}`);
  console.log(`   Top 10 categorías:`);
  Object.entries(categorias)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([cat, n]) => console.log(`     ${cat}: ${n}`));
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
