import { querySql, execSql } from "@/db/connection";
import { CircuitBreakerService, CircuitBreakerState } from "@/lib/types";

const FAILURE_THRESHOLD = 5;
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

interface CircuitStateData {
  state: CircuitBreakerState;
  failures: number;
  lastFailureAt?: number;
}

async function getSystemState(key: string): Promise<Record<string, CircuitStateData>> {
  const result = await querySql("SELECT value FROM system_state WHERE key = ?", [key]);
  const row = result.rows[0] as unknown as { value: string } | undefined;
  if (!row) return {};
  try {
    return JSON.parse(row.value);
  } catch {
    return {};
  }
}

async function setSystemState(key: string, value: Record<string, CircuitStateData>): Promise<void> {
  await execSql(`
    INSERT INTO system_state (key, value, updated_at) 
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `, [key, JSON.stringify(value)]);
}

async function getServiceState(service: CircuitBreakerService): Promise<CircuitStateData> {
  const states = await getSystemState("circuit_breakers");
  return states[service] || { state: "closed", failures: 0 };
}

async function saveServiceState(service: CircuitBreakerService, data: CircuitStateData): Promise<void> {
  const states = await getSystemState("circuit_breakers");
  states[service] = data;
  await setSystemState("circuit_breakers", states);
}

export async function getCircuitState(service: CircuitBreakerService): Promise<CircuitBreakerState> {
  const data = await getServiceState(service);
  
  if (data.state === "open" && data.lastFailureAt) {
    const now = Date.now();
    if (now - data.lastFailureAt >= COOLDOWN_MS) {
      return "half_open";
    }
  }
  
  return data.state;
}

export async function recordSuccess(service: CircuitBreakerService): Promise<void> {
  await saveServiceState(service, { state: "closed", failures: 0 });
}

export async function recordFailure(service: CircuitBreakerService): Promise<void> {
  const data = await getServiceState(service);
  data.failures += 1;
  data.lastFailureAt = Date.now();
  
  if (data.failures >= FAILURE_THRESHOLD) {
    data.state = "open";
  }
  
  await saveServiceState(service, data);
}

export async function isCircuitOpen(service: CircuitBreakerService): Promise<boolean> {
  const state = await getCircuitState(service);
  return state === "open";
}

export async function canAttempt(service: CircuitBreakerService): Promise<boolean> {
  const state = await getCircuitState(service);
  return state === "closed" || state === "half_open";
}

export async function resetCircuit(service: CircuitBreakerService): Promise<void> {
  await saveServiceState(service, { state: "closed", failures: 0 });
}

export async function getAllCircuitStates(): Promise<Record<CircuitBreakerService, CircuitBreakerState>> {
  const states = await getSystemState("circuit_breakers");
  const result: Partial<Record<CircuitBreakerService, CircuitBreakerState>> = {};
  
  const services: CircuitBreakerService[] = ["instagram_browser", "instagram_api", "openai"];
  for (const s of services) {
    result[s] = await getCircuitState(s);
  }
  
  return result as Record<CircuitBreakerService, CircuitBreakerState>;
}
