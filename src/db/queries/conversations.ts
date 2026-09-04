'use server';

import { getDb } from '@/db/connection';
import { conversations, messages, auditLog } from '@/db/schema';
import { eq, and, desc, sql, asc } from 'drizzle-orm';
import { MessageChannel } from '@/lib/types';

export async function createConversation(leadId: string, channel: MessageChannel) {
  const db = getDb();
  return db.insert(conversations)
    .values({ leadId, channel })
    .returning()
    .get();
}

export async function getConversationByLeadId(leadId: string) {
  const db = getDb();
  return db.select()
    .from(conversations)
    .where(and(eq(conversations.leadId, leadId), eq(conversations.status, 'active')))
    .orderBy(desc(conversations.startedAt))
    .get() || null;
}

export async function addMessage(data: typeof messages.$inferInsert) {
  const db = getDb();
  
  return db.transaction(async (tx) => {
    // Dedup by metaMessageId if available
    if (data.metaMessageId) {
      const existing = await tx.select().from(messages).where(eq(messages.metaMessageId, data.metaMessageId)).get();
      if (existing) return existing;
    }
    
    const message = await tx.insert(messages).values(data).returning().get();
    
    await tx.update(conversations)
      .set({ lastMessageAt: sql`(datetime('now'))`, updatedAt: sql`(datetime('now'))` })
      .where(eq(conversations.id, data.conversationId))
      .run();
      
    return message;
  });
}

export async function getConversationMessages(conversationId: string, limit: number, offset: number = 0) {
  const db = getDb();
  return db.select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.sentAt))
    .limit(limit)
    .offset(offset)
    .all();
}

export async function getConversationTimeline(leadId: string) {
  const db = getDb();
  
  const leadMessages = await db.select().from(messages).where(eq(messages.leadId, leadId)).all();
  const leadAudits = await db.select().from(auditLog).where(and(eq(auditLog.entityType, 'lead'), eq(auditLog.entityId, leadId))).all();
  
  const timeline = [
    ...leadMessages.map(m => ({ type: 'message' as const, date: m.sentAt, data: m })),
    ...leadAudits.map(a => ({ type: 'audit' as const, date: a.createdAt, data: a }))
  ];
  
  timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return timeline;
}

export async function isApiWindowOpen(conversationId: string) {
  const db = getDb();
  const conv = await db.select({ apiWindowExpiresAt: conversations.apiWindowExpiresAt })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .get();
    
  if (!conv || !conv.apiWindowExpiresAt) return false;
  return new Date(conv.apiWindowExpiresAt) > new Date();
}

export async function setApiWindow(conversationId: string, expiresAt: string) {
  const db = getDb();
  return db.update(conversations)
    .set({ apiWindowExpiresAt: expiresAt, updatedAt: sql`(datetime('now'))` })
    .where(eq(conversations.id, conversationId))
    .returning()
    .get();
}

export async function handoffToApi(leadId: string) {
  const db = getDb();
  const conv = await getConversationByLeadId(leadId);
  if (!conv) return null;
  
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  
  return db.update(conversations)
    .set({ 
      channel: 'api', 
      apiWindowExpiresAt: expiresAt,
      updatedAt: sql`(datetime('now'))`
    })
    .where(eq(conversations.id, conv.id))
    .returning()
    .get();
}

export async function closeConversation(conversationId: string, reason: string) {
  const db = getDb();
  return db.update(conversations)
    .set({ 
      status: 'closed', 
      closedAt: sql`(datetime('now'))`, 
      closeReason: reason,
      updatedAt: sql`(datetime('now'))`
    })
    .where(eq(conversations.id, conversationId))
    .returning()
    .get();
}
