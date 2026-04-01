// =============================================================
// Sellix AI — Logging estructurado JSON a stdout (SECURITY-03)
// Nunca incluir datos personales (cédulas, contraseñas) en logs
// =============================================================

import { randomUUID } from "crypto";

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  correlationId: string;
  message: string;
  context?: Record<string, unknown>;
}

function writeLog(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    correlationId: randomUUID(),
    message,
    ...(context ? { context } : {}),
  };

  // stdout — capturado por Vercel Logs
  process.stdout.write(JSON.stringify(entry) + "\n");
}

export function logInfo(
  message: string,
  context?: Record<string, unknown>
): void {
  writeLog("info", message, context);
}

export function logWarn(
  message: string,
  context?: Record<string, unknown>
): void {
  writeLog("warn", message, context);
}

export function logError(
  message: string,
  context?: Record<string, unknown>
): void {
  writeLog("error", message, context);
}

/**
 * Registra eventos de autenticación (SECURITY-03).
 * NUNCA loguear la contraseña ni el hash.
 */
export function logAuthEvent(
  event:
    | "auth_success"
    | "auth_failure"
    | "auth_blocked"
    | "auth_config_missing"
    | "session_ended",
  context: Record<string, unknown>
): void {
  const level: LogLevel =
    event === "auth_success" ? "info" :
    event === "session_ended" ? "info" :
    event === "auth_blocked" ? "warn" : "warn";

  writeLog(level, `AUTH_EVENT:${event}`, context);
}
