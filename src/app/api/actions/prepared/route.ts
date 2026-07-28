// =============================================================
// Sellix AI — List prepared actions ready for approval
// =============================================================

import { NextResponse } from "next/server";
import { sql, withTenant, hasDatabase, DEFAULT_TENANT_ID } from "@/lib/db";

export const dynamic = "force-dynamic";

interface PreparedActionRow {
  id: string;
  category: string;
  priority: string;
  title: string;
  description: string;
  recipients: unknown;
  suggested_message: string;
  channel: string;
  offer: { description?: string } | null;
  ingreso_estimado: string;
  ingreso_realista: string;
  status: string;
  expires_at: Date;
  computed_at: Date;
}

export async function GET() {
  if (!hasDatabase) {
    return NextResponse.json({ actions: [] });
  }

  const rows = await withTenant(DEFAULT_TENANT_ID, (tx) => tx<PreparedActionRow[]>`
    SELECT id, category, priority, title, description, recipients,
           suggested_message, channel, offer,
           ingreso_estimado, ingreso_realista, status,
           expires_at, computed_at
    FROM prepared_actions
    WHERE tenant_id = ${DEFAULT_TENANT_ID}
      AND status = 'ready'
      AND (expires_at IS NULL OR expires_at > now())
    ORDER BY
      CASE priority
        WHEN 'critica' THEN 0
        WHEN 'alta' THEN 1
        WHEN 'media' THEN 2
        ELSE 3
      END,
      computed_at DESC
  `);

  return NextResponse.json({
    actions: rows.map((r) => ({
      id: r.id,
      category: r.category,
      priority: r.priority,
      title: r.title,
      description: r.description,
      recipients: r.recipients,
      suggested_message: r.suggested_message,
      channel: r.channel,
      offer: r.offer,
      ingreso_estimado: Number(r.ingreso_estimado),
      ingreso_realista: Number(r.ingreso_realista),
      status: r.status,
      expires_at: r.expires_at,
      computed_at: r.computed_at,
    })),
  });
}
