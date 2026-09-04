import { getEnvConfig } from "@/lib/config";
import { getDb } from "@/db/connection";
import { leads, messages, jobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export function handleWebhookVerification(params: URLSearchParams) {
  const env = getEnvConfig();
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token === env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
    return challenge;
  }
  return null;
}

export async function handleWebhookEvent(rawBody: string, signature: string, payload: any) {
  const env = getEnvConfig();
  const hmac = crypto.createHmac("sha256", env.INSTAGRAM_APP_SECRET);
  const expectedSignature = `sha256=${hmac.update(rawBody).digest("hex")}`;
  
  if (signature !== expectedSignature) {
    throw new Error("Invalid signature");
  }

  const db = getDb();
  
  if (payload.object === "instagram") {
    for (const entry of payload.entry || []) {
      for (const messaging of entry.messaging || []) {
        if (messaging.message && !messaging.message.is_echo) {
          const senderId = messaging.sender.id;
          const metaMessageId = messaging.message.mid;
          const text = messaging.message.text;
          
          // Check for idempotency
          const existingMessage = await db.select().from(messages).where(eq(messages.metaMessageId, metaMessageId)).limit(1);
          if (existingMessage.length > 0) {
            continue;
          }
          
          let leadMatch = await db.select().from(leads).where(eq(leads.instagramId, senderId)).limit(1);
          let leadId = leadMatch.length > 0 ? leadMatch[0].id : undefined;
          
          // Fallback context finding could be added here if needed
          
          await db.insert(jobs).values({
            type: "process_inbound",
            payload: JSON.stringify({
              metaMessageId,
              senderId,
              text,
              leadId,
              timestamp: messaging.timestamp
            }),
          });
        }
      }
    }
  }
}
