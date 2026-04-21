// =============================================================
// Sellix AI — Promotion Match Engine
// Recibe un producto en promoción y encuentra los clientes con
// mayor probabilidad de comprarlo, priorizando contactables.
//
// Score de probabilidad (0-100):
//   + 50  si el cliente ha comprado EXACTAMENTE ese producto antes
//   + 30  si tiene reposición pendiente de ese producto
//   + 20  si compra productos de la MISMA categoría terapéutica
//   + 15  si es cliente recurrente (no ocasional/inactivo)
//   + 10  por cada compra histórica de producto similar
//   +  5  si compra productos del mismo tratamiento
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import type { ClienteRecurrencia, ProductoClasificado, ReposicionPendiente } from "@/lib/types";

export const dynamic = "force-dynamic";

const DATA_DIR = join(process.cwd(), "data", "output");

async function loadJSON<T>(name: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(join(DATA_DIR, name), "utf-8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

interface PromotionMatch {
  cedula: string;
  nombre: string;
  telefono: string | null;
  contactable: boolean;
  score: number;
  razones: string[];
  tipo_cliente: string;
  ultima_compra: string;
  ingreso_total: number;
  ticket_promedio: number;
  veces_producto: number;     // veces que ha comprado el producto exacto
  veces_categoria: number;    // veces que ha comprado productos de la misma categoría
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { codigo, nombre: nombreProducto } = body as { codigo: string; nombre: string };

    if (!codigo && !nombreProducto) {
      return NextResponse.json({ error: "Falta código o nombre del producto" }, { status: 400 });
    }

    const [recurrencia, clasificados, reposicion] = await Promise.all([
      loadJSON<ClienteRecurrencia[]>("recurrencia_clientes.json", []),
      loadJSON<ProductoClasificado[]>("productos_clasificados.json", []),
      loadJSON<ReposicionPendiente[]>("reposicion_pendiente.json", []),
    ]);

    // Find product classification
    const producto = clasificados.find((p) => p.codigo === codigo);
    const categoriaPromo = producto?.categoria_terapeutica;
    const tratamientoPromo = producto?.tratamiento;

    // Index reposiciones by cedula + product
    const reposMap = new Map<string, ReposicionPendiente[]>();
    for (const r of reposicion) {
      if (!reposMap.has(r.cedula)) reposMap.set(r.cedula, []);
      reposMap.get(r.cedula)!.push(r);
    }

    const matches: PromotionMatch[] = [];

    for (const cli of recurrencia) {
      let score = 0;
      const razones: string[] = [];

      // Check if bought this exact product
      const productoMatch = cli.top_productos.find(
        (p) => p.codigo === codigo ||
               (nombreProducto && p.nombre.toLowerCase().includes(nombreProducto.toLowerCase().split(" ")[0]))
      );
      const vecesProducto = productoMatch?.veces || 0;
      if (vecesProducto > 0) {
        score += 50 + Math.min(vecesProducto * 5, 25);
        razones.push(`Compró este producto ${vecesProducto}x`);
      }

      // Check reposición pendiente
      const misRepos = reposMap.get(cli.cedula) || [];
      const reposicionMatch = misRepos.find(
        (r) => nombreProducto && r.producto.toLowerCase().includes(nombreProducto.toLowerCase().split(" ")[0])
      );
      if (reposicionMatch) {
        score += 30;
        razones.push(`Tiene reposición pendiente`);
      }

      // Check category match
      let vecesCategoria = 0;
      if (categoriaPromo && cli.top_categorias) {
        const catMatch = cli.top_categorias.find((c) => c.categoria === categoriaPromo);
        if (catMatch) {
          vecesCategoria = catMatch.veces;
          score += 20 + Math.min(vecesCategoria * 2, 15);
          razones.push(`Compra de ${categoriaPromo}`);
        }
      }

      // Check treatment match
      if (tratamientoPromo && cli.top_tratamientos) {
        const tratMatch = cli.top_tratamientos.find((t) => t.tratamiento === tratamientoPromo);
        if (tratMatch) {
          score += 5 + Math.min(tratMatch.veces, 10);
          if (razones.length < 3) razones.push(`Tratamiento: ${tratamientoPromo}`);
        }
      }

      // Recurrent client bonus
      if (cli.tipo_cliente.startsWith("recurrente_") || cli.tipo_cliente === "frecuente_multicomprador") {
        score += 15;
      }
      if (cli.tipo_cliente === "inactivo") score -= 10;

      // Only include clients with some signal
      if (score <= 10) continue;

      const contactable = !!cli.telefono && String(cli.telefono).trim().length >= 7;

      matches.push({
        cedula: cli.cedula,
        nombre: cli.nombre,
        telefono: cli.telefono,
        contactable,
        score: Math.min(100, Math.round(score)),
        razones,
        tipo_cliente: cli.tipo_cliente,
        ultima_compra: cli.ultima_compra,
        ingreso_total: cli.ingreso_total,
        ticket_promedio: cli.ticket_promedio,
        veces_producto: vecesProducto,
        veces_categoria: vecesCategoria,
      });
    }

    // Sort: contactables first, then by score
    matches.sort((a, b) => {
      if (a.contactable !== b.contactable) return a.contactable ? -1 : 1;
      return b.score - a.score;
    });

    const contactables = matches.filter((m) => m.contactable);
    const noContactables = matches.filter((m) => !m.contactable);

    return NextResponse.json({
      total: matches.length,
      contactables_count: contactables.length,
      no_contactables_count: noContactables.length,
      categoria: categoriaPromo || null,
      tratamiento: tratamientoPromo || null,
      matches: matches.slice(0, 200),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error" },
      { status: 500 }
    );
  }
}
