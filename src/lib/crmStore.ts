// =============================================================
// Sellix AI — CRM Storage
// Uses Redis (via REDIS_URL) on Vercel, filesystem locally
// =============================================================

import IORedis from "ioredis";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { Conversation } from "./types";

const CRM_KEY = "sellix:conversations";
const CRM_DIR = join(process.cwd(), "data", "crm");
const CRM_FILE = join(CRM_DIR, "conversations.json");

let redisClient: IORedis | null = null;

function getRedis(): IORedis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  if (!redisClient) {
    redisClient = new IORedis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      lazyConnect: true,
    });
  }
  return redisClient;
}

export async function loadConversations(): Promise<Conversation[]> {
  const redis = getRedis();

  if (redis) {
    try {
      await redis.connect().catch(() => {}); // Already connected is OK
      const data = await redis.get(CRM_KEY);
      if (data) return JSON.parse(data);
      return [];
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
      await redis.connect().catch(() => {});
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
