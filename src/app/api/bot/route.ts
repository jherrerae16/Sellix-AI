// =============================================================
// Sellix AI — Bot Config API (mode: auto/copilot/manual)
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { getBotConfig, setBotConfig } from "@/lib/botConfig";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getBotConfig();
  return NextResponse.json(config);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const config = await setBotConfig(body);
  return NextResponse.json(config);
}
