import { getDb } from "@/db/connection";
import { leads, auditLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getBusinessConfig } from "@/lib/config";

export async function generateWhatsAppHandoff(leadId: string) {
  const db = getDb();
  const config = getBusinessConfig();
  
  await db.transaction(async (tx) => {
    const [lead] = await tx.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    if (!lead) throw new Error("Lead not found");
    
    await tx.update(leads)
      .set({
        pipelineStatus: "whatsapp_handoff"
      })
      .where(eq(leads.id, leadId));
      
    await tx.insert(auditLog).values({
      entityType: "lead",
      entityId: leadId,
      action: "whatsapp_handoff_generated",
      details: JSON.stringify({ link: config.contact.whatsappLink })
    });
  });
  
  return config.contact.whatsappLink;
}
