// =============================================================
// Sellix AI — Rate limiter en memoria (SECURITY-11)
// 5 intentos fallidos → bloqueo de 15 minutos por IP
// Suficiente para MVP single-instance en Vercel
// =============================================================

interface AuthAttempt {
  ip: string;
  count: number;
  lastAttempt: Date;
  blockedUntil: Date | null;
}

interface RateLimitResult {
  allowed: boolean;
  minutesRemaining?: number;
}

const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutos

const attempts = new Map<string, AuthAttempt>();

export const rateLimiter = {
  /**
   * Verifica si una IP puede intentar autenticarse.
   * Devuelve { allowed: true } si no está bloqueada.
   */
  check(ip: string): RateLimitResult {
    const record = attempts.get(ip);

    if (!record) {
      return { allowed: true };
    }

    if (record.blockedUntil && record.blockedUntil > new Date()) {
      const remainingMs = record.blockedUntil.getTime() - Date.now();
      const minutesRemaining = Math.ceil(remainingMs / 60000);
      return { allowed: false, minutesRemaining };
    }

    // Bloqueo expirado — limpiar registro
    if (record.blockedUntil && record.blockedUntil <= new Date()) {
      attempts.delete(ip);
      return { allowed: true };
    }

    return { allowed: true };
  },

  /**
   * Registra un intento fallido. Bloquea la IP al llegar al límite.
   */
  increment(ip: string): void {
    const record = attempts.get(ip);
    const now = new Date();

    if (!record) {
      attempts.set(ip, {
        ip,
        count: 1,
        lastAttempt: now,
        blockedUntil: null,
      });
      return;
    }

    record.count += 1;
    record.lastAttempt = now;

    if (record.count >= MAX_ATTEMPTS) {
      record.blockedUntil = new Date(now.getTime() + BLOCK_DURATION_MS);
    }

    attempts.set(ip, record);
  },

  /**
   * Resetea el contador de intentos tras un login exitoso.
   */
  reset(ip: string): void {
    attempts.delete(ip);
  },
};
