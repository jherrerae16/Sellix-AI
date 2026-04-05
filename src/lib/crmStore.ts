// =============================================================
// Sellix AI — CRM Storage (Vercel KV or filesystem fallback)
// Uses Redis on Vercel, filesystem locally
// =============================================================

import { kv } from "@vercel/kv";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { Conversation } from "./types";

const CRM_KEY = "sellix:conversations";
const CRM_DIR = join(process.cwd(), "data", "crm");
const CRM_FILE = join(CRM_DIR, "conversations.json");

const useKV = !!process.env.KV_REST_API_URL;

export async function loadConversations(): Promise<Conversation[]> {
  if (useKV) {
    try {
      const data = await kv.get<Conversation[]>(CRM_KEY);
      return data ?? [];
    } catch (err) {
      console.error("KV read error:", err);
      return [];
    }
  }

  // Filesystem fallback (local dev)
  try {
    const raw = await readFile(CRM_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveConversations(convs: Conversation[]): Promise<void> {
  if (useKV) {
    try {
      await kv.set(CRM_KEY, convs);
    } catch (err) {
      console.error("KV write error:", err);
    }
    return;
  }

  // Filesystem fallback (local dev)
  try {
    await mkdir(CRM_DIR, { recursive: true });
    await writeFile(CRM_FILE, JSON.stringify(convs, null, 2), "utf-8");
  } catch {
    // Read-only FS
  }
}
