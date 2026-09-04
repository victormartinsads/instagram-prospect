import { getDb } from "@/db/connection";
import { leads, auditLog } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function performHandoff(leadId: string, instagramScopedUserId: string) {
  const db = getDb();
  
  await db.transaction(async (tx) => {
    const [lead] = await tx.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    if (!lead) throw new Error("Lead not found");
    
    await tx.update(leads)
      .set({
        instagramId: instagramScopedUserId,
        channelStatus: "api_active"
      })
      .where(eq(leads.id, leadId));
      
    await tx.insert(auditLog).values({
      entityType: "lead",
      entityId: leadId,
      action: "channel_handoff",
      details: JSON.stringify({ from: "browser", to: "api" })
    });
  });
}
