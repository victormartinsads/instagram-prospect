import crypto from "crypto";
import { getEnvConfig } from "@/lib/config";

export function validateWebhookSignature(rawBody: Buffer, signature: string): boolean {
  const env = getEnvConfig();
  const secret = env.INSTAGRAM_APP_SECRET;
  
  if (!secret) {
    return false;
  }
  
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
    
  return signature === `sha256=${expectedSignature}`;
}

export function sanitizeForLog(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ["token", "key", "secret", "password", "authorization"];
  
  function sanitize(target: unknown): unknown {
    if (Array.isArray(target)) {
      return target.map(sanitize);
    }
    
    if (target !== null && typeof target === "object") {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(target as Record<string, unknown>)) {
        const lowerKey = k.toLowerCase();
        if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
          result[k] = "***REDACTED***";
        } else {
          result[k] = sanitize(v);
        }
      }
      return result;
    }
    
    return target;
  }
  
  return sanitize(obj) as Record<string, unknown>;
}

export function validateEnvOnStartup(): void {
  try {
    const env = getEnvConfig();
    
    const optionalWarnings = [
      { key: "INSTAGRAM_APP_SECRET", value: env.INSTAGRAM_APP_SECRET, message: "Instagram API integration will be disabled" },
      { key: "INSTAGRAM_PAGE_ACCESS_TOKEN", value: env.INSTAGRAM_PAGE_ACCESS_TOKEN, message: "Instagram API messaging will be disabled" },
      { key: "INSTAGRAM_BUSINESS_ACCOUNT_ID", value: env.INSTAGRAM_BUSINESS_ACCOUNT_ID, message: "Instagram API operations will be disabled" },
    ];
    
    for (const w of optionalWarnings) {
      if (!w.value) {
        console.warn(`[WARNING] Missing ${w.key}: ${w.message}`);
      }
    }
    
    console.log("[INFO] Environment validation passed.");
  } catch (error) {
    console.error("[ERROR] Environment validation failed:");
    console.error((error as Error).message);
    process.exit(1);
  }
}
