import { beforeAll, afterAll } from "vitest";

// Set test environment variables
process.env.DATABASE_URL = ":memory:";
process.env.OPENAI_API_KEY = "sk-test-key-for-testing";
process.env.OPENAI_MODEL = "gpt-4o";
process.env.OPENAI_MODEL_FAST = "gpt-4o-mini";
process.env.OPENAI_MONTHLY_BUDGET_USD = "50";
process.env.CHROME_CDP_URL = "http://127.0.0.1:9222";
process.env.MAX_DMS_PER_DAY = "30";
process.env.MIN_SECONDS_BETWEEN_DMS = "90";
process.env.MAX_SECONDS_BETWEEN_DMS = "240";
process.env.OPERATING_HOURS = "00:00-23:59";
process.env.OPERATING_TIMEZONE = "America/Sao_Paulo";
process.env.INSTAGRAM_APP_SECRET = "test-secret";
process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN = "test-verify-token";

beforeAll(async () => {
  // Ensure test tables exist
  const { ensureTablesExist } = await import("@/db/migrate");
  await ensureTablesExist();
});
