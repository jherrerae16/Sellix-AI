// =============================================================
// Sellix AI — Bot Configuration (stored in Redis)
// Modes: auto | copilot | manual
// =============================================================

import IORedis from "ioredis";

const CONFIG_KEY = "sellix:bot_config";

type BotMode = "auto" | "copilot" | "manual";

interface BotConfig {
  mode: BotMode;
}

const DEFAULT_CONFIG: BotConfig = {
  mode: "auto",
};

let redis: IORedis | null = null;

function getRedis(): IORedis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (!redis) {
    redis = new IORedis(url, { maxRetriesPerRequest: 1, connectTimeout: 5000, lazyConnect: true });
  }
  return redis;
}

export async function getBotConfig(): Promise<BotConfig> {
  const r = getRedis();
  if (r) {
    try {
      await r.connect().catch(() => {});
      const data = await r.get(CONFIG_KEY);
      if (data) return JSON.parse(data);
    } catch { /* fallback */ }
  }
  return DEFAULT_CONFIG;
}

export async function setBotConfig(config: Partial<BotConfig>): Promise<BotConfig> {
  const current = await getBotConfig();
  const updated = { ...current, ...config };
  const r = getRedis();
  if (r) {
    try {
      await r.connect().catch(() => {});
      await r.set(CONFIG_KEY, JSON.stringify(updated));
    } catch { /* ignore */ }
  }
  return updated;
}
