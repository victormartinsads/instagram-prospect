import { z } from "zod";
import { readFileSync } from "fs";
import { join } from "path";

// ── Business Config Schema ──────────────────────────────────────────────────

const businessConfigSchema = z.object({
  owner: z.object({
    name: z.string().min(1),
    role: z.string().min(1),
  }),
  company: z.object({
    name: z.string().min(1),
    website: z.string(),
    instagramHandle: z.string().min(1),
  }),
  contact: z.object({
    whatsappLink: z.string(),
    affiliateGroupLink: z.string(),
  }),
  pitch: z.object({
    oneLiner: z.string().min(1),
    howItWorks: z.array(z.string()),
    revenueModel: z.string().min(1),
  }),
  claims: z.object({
    verified: z.array(z.string()),
    unverified: z.array(z.string()),
  }),
  icp: z.object({
    segments: z.array(z.string()),
    keywords: z.array(z.string()),
    geography: z.string().min(1),
  }),
  affiliates: z.object({
    topics: z.array(z.string()),
  }),
  marketJargon: z.string(),
});

export type BusinessConfig = z.infer<typeof businessConfigSchema>;

// ── Environment Config Schema ───────────────────────────────────────────────

const envConfigSchema = z.object({
  OPENAI_API_KEY: z.string().optional().default(""),
  GEMINI_API_KEY: z.string().optional().default(""),
  OPENAI_MODEL: z.string().default("gpt-4o"),
  OPENAI_MODEL_FAST: z.string().default("gpt-4o-mini"),
  OPENAI_MONTHLY_BUDGET_USD: z.coerce.number().positive().default(50),

  CHROME_CDP_URL: z.string().url().default("http://127.0.0.1:9222"),
  CHROME_PROFILE_DIR: z.string().optional(),

  INSTAGRAM_APP_SECRET: z.string().default(""),
  INSTAGRAM_PAGE_ACCESS_TOKEN: z.string().default(""),
  INSTAGRAM_WEBHOOK_VERIFY_TOKEN: z.string().default(""),
  INSTAGRAM_BUSINESS_ACCOUNT_ID: z.string().default(""),

  DATABASE_URL: z.string().default("./data/prospector.db"),

  MAX_DMS_PER_DAY: z.coerce.number().int().positive().default(30),
  MIN_SECONDS_BETWEEN_DMS: z.coerce.number().int().positive().default(90),
  MAX_SECONDS_BETWEEN_DMS: z.coerce.number().int().positive().default(240),

  OPERATING_HOURS: z.string().default("09:00-20:00"),
  OPERATING_TIMEZONE: z.string().default("America/Sao_Paulo"),
});

export type EnvConfig = z.infer<typeof envConfigSchema>;

// ── Singletons ──────────────────────────────────────────────────────────────

let _businessConfig: BusinessConfig | null = null;
let _envConfig: EnvConfig | null = null;

export function getBusinessConfig(): BusinessConfig {
  if (_businessConfig) return _businessConfig;

  const configPath = join(process.cwd(), "config", "business.json");
  try {
    const raw = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw);
    _businessConfig = businessConfigSchema.parse(parsed);
    return _businessConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
      throw new Error(`Invalid config/business.json:\n${issues}`);
    }
    throw new Error(`Failed to read config/business.json: ${error}`);
  }
}

export function getEnvConfig(): EnvConfig {
  if (_envConfig) return _envConfig;

  try {
    _envConfig = envConfigSchema.parse(process.env);
    return _envConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
      throw new Error(`Invalid environment variables:\n${issues}`);
    }
    throw error;
  }
}

/** Check if Instagram API credentials are configured */
export function hasInstagramApiCredentials(): boolean {
  const env = getEnvConfig();
  return !!(
    env.INSTAGRAM_APP_SECRET &&
    env.INSTAGRAM_PAGE_ACCESS_TOKEN &&
    env.INSTAGRAM_BUSINESS_ACCOUNT_ID
  );
}

/** Check if affiliate funnel is configured */
export function isAffiliateFunnelEnabled(): boolean {
  const biz = getBusinessConfig();
  return biz.affiliates.topics.length > 0 && !!biz.contact.affiliateGroupLink;
}

/** Parse operating hours from string like "09:00-20:00" */
export function parseOperatingHours(): { startHour: number; startMinute: number; endHour: number; endMinute: number } {
  const env = getEnvConfig();
  const [start, end] = env.OPERATING_HOURS.split("-");
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  return { startHour, startMinute, endHour, endMinute };
}
