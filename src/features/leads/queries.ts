import { getDb } from "@/db/connection";
import { leads, conversations, messages } from "@/db/schema";
import { eq, like, or } from "drizzle-orm";
import { LeadType } from "@/lib/types";

export async function getLeadsForKanban(leadType: LeadType) {
  const db = getDb();
  const allLeads = await db.select().from(leads).where(eq(leads.leadType, leadType));
  
  const grouped = allLeads.reduce((acc, lead) => {
    const status = lead.pipelineStatus as string;
    if (!acc[status]) acc[status] = [];
    acc[status].push(lead);
    return acc;
  }, {} as Record<string, typeof leads.$inferSelect[]>);
  
  return grouped;
}

export async function getLeadDetail(id: string) {
  const db = getDb();
  const [lead] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  if (!lead) return null;
  
  const [conv] = await db.select().from(conversations).where(eq(conversations.leadId, id)).limit(1);
  const convMessages = conv ? await db.select().from(messages).where(eq(messages.conversationId, conv.id)) : [];
  
  return { ...lead, conversation: conv, messages: convMessages };
}

export async function getLeadStats() {
  const db = getDb();
  const allLeads = await db.select().from(leads);
  return {
    total: allLeads.length,
    qualified: allLeads.filter(l => l.pipelineStatus === "qualified").length,
    contacted: allLeads.filter(l => l.pipelineStatus === "contacted").length,
  };
}

export async function searchLeads(query: string) {
  const db = getDb();
  return db.select().from(leads).where(
    or(
      like(leads.instagramHandle, `%${query}%`),
      like(leads.name, `%${query}%`)
    )
  );
}
