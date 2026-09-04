import { querySql, execSql } from "@/db/connection";
import { getEnvConfig, parseOperatingHours } from "@/lib/config";
import { getWarmupLimit } from "@/lib/types";

async function getSystemState(key: string): Promise<any> {
  const result = await querySql("SELECT value FROM system_state WHERE key = ?", [key]);
  const row = result.rows[0] as unknown as { value: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return null;
  }
}

async function setSystemState(key: string, value: any): Promise<void> {
  await execSql(`
    INSERT INTO system_state (key, value, updated_at) 
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `, [key, JSON.stringify(value)]);
}

export function isWithinOperatingHours(): boolean {
  const env = getEnvConfig();
  const { startHour, startMinute, endHour, endMinute } = parseOperatingHours();
  
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: env.OPERATING_TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  
  const parts = formatter.formatToParts(new Date());
  const currentHour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  const currentMinute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
  
  const currentMinutes = currentHour * 60 + currentMinute;
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

export async function getDailyStats(): Promise<{ sent: number; limit: number; warmupDay: number }> {
  const env = getEnvConfig();
  
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: env.OPERATING_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  const todayStr = `${year}-${month}-${day}`;
  
  const dailyCountObj = (await getSystemState("daily_dm_count")) || { date: todayStr, count: 0 };
  let sent = dailyCountObj.count;
  if (dailyCountObj.date !== todayStr) {
    sent = 0;
  }
  
  let warmupStartStr = await getSystemState("warmup_start_date");
  if (!warmupStartStr) {
    warmupStartStr = todayStr;
    await setSystemState("warmup_start_date", warmupStartStr);
  }
  
  const startMs = new Date(`${warmupStartStr}T00:00:00Z`).getTime();
  const todayMs = new Date(`${todayStr}T00:00:00Z`).getTime();
  const daysSinceStart = Math.max(0, Math.floor((todayMs - startMs) / (1000 * 60 * 60 * 24)));
  
  const warmupDay = daysSinceStart + 1;
  const warmupLimit = getWarmupLimit(daysSinceStart);
  const limit = Math.min(env.MAX_DMS_PER_DAY, warmupLimit);
  
  return { sent, limit, warmupDay };
}

export async function canSendDM(): Promise<{ allowed: boolean; reason?: string; retryAfterSeconds?: number }> {
  const isPaused = (await getSystemState("system_paused")) === true;
  if (isPaused) {
    return { allowed: false, reason: "System is paused" };
  }
  
  if (!isWithinOperatingHours()) {
    return { allowed: false, reason: "Outside of operating hours" };
  }
  
  const stats = await getDailyStats();
  if (stats.sent >= stats.limit) {
    return { allowed: false, reason: "Daily DM limit reached" };
  }
  
  return { allowed: true };
}

export async function recordDMSent(): Promise<void> {
  const env = getEnvConfig();
  
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: env.OPERATING_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  const todayStr = `${year}-${month}-${day}`;
  
  const dailyCountObj = (await getSystemState("daily_dm_count")) || { date: todayStr, count: 0 };
  if (dailyCountObj.date !== todayStr) {
    dailyCountObj.date = todayStr;
    dailyCountObj.count = 0;
  }
  
  dailyCountObj.count += 1;
  await setSystemState("daily_dm_count", dailyCountObj);
}

export function getRandomDelay(): number {
  const env = getEnvConfig();
  const min = env.MIN_SECONDS_BETWEEN_DMS;
  const max = env.MAX_SECONDS_BETWEEN_DMS;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
