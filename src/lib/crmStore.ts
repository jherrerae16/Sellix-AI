// =============================================================
// Sellix AI — CRM Storage
// Uses Upstash Redis (via REDIS_URL) on Vercel, filesystem locally
// =============================================================

import { Redis } from "@upstash/redis";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { Conversation } from "./types";

const CRM_KEY = "sellix:conversations";
const CRM_DIR = join(process.cwd(), "data", "crm");
const CRM_FILE = join(CRM_DIR, "conversations.json");

function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    return new Redis({ url, token: "" });
  } catch {
    // REDIS_URL might be a full redis:// URL, try parsing it differently
  }

  // Try as regular Redis URL (redis://default:token@host:port)
  // Upstash Redis constructor needs {url, token} for REST API
  // or we can use the REDIS_URL directly if it's a REST URL
  try {
    // If it starts with https://, it's a REST URL
    if (url.startsWith("https://")) {
      return new Redis({ url, token: process.env.REDIS_TOKEN || "" });
    }
  } catch {
    return null;
  }

  return null;
}

export async function loadConversations(): Promise<Conversation[]> {
  const redis = getRedis();

  if (redis) {
    try {
      const data = await redis.get<Conversation[]>(CRM_KEY);
      return data ?? [];
    } catch (err) {
      console.error("Redis read error:", err);
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
  const redis = getRedis();

  if (redis) {
    try {
      await redis.set(CRM_KEY, JSON.stringify(convs));
      return;
    } catch (err) {
      console.error("Redis write error:", err);
    }
  }

  // Filesystem fallback
  try {
    await mkdir(CRM_DIR, { recursive: true });
    await writeFile(CRM_FILE, JSON.stringify(convs, null, 2), "utf-8");
  } catch {
    // Read-only FS
  }
}
