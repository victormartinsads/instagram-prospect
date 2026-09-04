import { getEnvConfig, hasInstagramApiCredentials } from "@/lib/config";
import { getDb } from "@/db/connection";
import { leads, conversations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ApiWindowExpiredError, DoNotContactError, RateLimitError } from "@/lib/errors";

let requestCount = 0;
let lastReset = Date.now();

function enforceRateLimit() {
  const now = Date.now();
  if (now - lastReset > 1000) {
    requestCount = 0;
    lastReset = now;
  }
  if (requestCount >= 100) {
    throw new RateLimitError("instagram_api", 1);
  }
  requestCount++;
}

async function validateLead(leadId: string) {
  const db = getDb();
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) throw new Error("Lead not found");
  if (lead.doNotContact) throw new DoNotContactError(lead.instagramHandle);
  
  const [conv] = await db.select().from(conversations).where(eq(conversations.leadId, leadId)).limit(1);
  if (conv && conv.apiWindowExpiresAt) {
    const expiresAt = new Date(conv.apiWindowExpiresAt).getTime();
    if (Date.now() > expiresAt) {
      throw new ApiWindowExpiredError(leadId);
    }
  }
  
  if (!lead.instagramId) throw new Error("Lead does not have an IGSID");
  return lead.instagramId;
}

export async function sendMessage(leadId: string, text: string): Promise<string> {
  if (!hasInstagramApiCredentials()) {
    throw new Error("Instagram API credentials not configured");
  }
  
  enforceRateLimit();
  const recipientIgId = await validateLead(leadId);
  const env = getEnvConfig();
  
  const url = `https://graph.facebook.com/v21.0/${env.INSTAGRAM_BUSINESS_ACCOUNT_ID}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${env.INSTAGRAM_PAGE_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      recipient: { id: recipientIgId },
      message: { text },
    }),
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Instagram API Error: ${JSON.stringify(data)}`);
  }
  return data.message_id;
}

export async function sendMessageWithHumanAgent(leadId: string, text: string): Promise<string> {
  if (!hasInstagramApiCredentials()) {
    throw new Error("Instagram API credentials not configured");
  }
  
  enforceRateLimit();
  const recipientIgId = await validateLead(leadId);
  const env = getEnvConfig();
  
  const url = `https://graph.facebook.com/v21.0/${env.INSTAGRAM_BUSINESS_ACCOUNT_ID}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${env.INSTAGRAM_PAGE_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      recipient: { id: recipientIgId },
      message: { text },
      messaging_type: "MESSAGE_TAG",
      tag: "HUMAN_AGENT",
    }),
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Instagram API Error: ${JSON.stringify(data)}`);
  }
  return data.message_id;
}
