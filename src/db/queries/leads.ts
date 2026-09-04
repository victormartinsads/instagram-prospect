'use server';

import { getDb } from '@/db/connection';
import { leads, auditLog } from '@/db/schema';
import { eq, and, or, desc, sql, like, count, lte } from 'drizzle-orm';
import { DuplicateLeadError } from '@/lib/errors';
import { PipelineStatus, ChannelStatus, LeadType, AuditActor } from '@/lib/types';

export type CreateLeadData = typeof leads.$inferInsert;
export type UpdateLeadData = Partial<Omit<typeof leads.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>>;

export async function createLead(data: CreateLeadData) {
  const db = getDb();
  
  const existing = await db.select().from(leads).where(eq(leads.instagramHandle, data.instagramHandle)).get();
  if (existing) {
    throw new DuplicateLeadError(data.instagramHandle);
  }
  
  const result = await db.insert(leads).values(data).returning().get();
  return result;
}

export async function getLeadById(id: string) {
  const db = getDb();
  return db.select().from(leads).where(eq(leads.id, id)).get() || null;
}

export async function getLeadByHandle(handle: string) {
  const db = getDb();
  return db.select().from(leads).where(eq(leads.instagramHandle, handle)).get() || null;
}

export async function getLeadByInstagramId(igId: string) {
  const db = getDb();
  return db.select().from(leads).where(eq(leads.instagramId, igId)).get() || null;
}

export async function listLeads(filters: {
  pipelineStatus?: PipelineStatus;
  channelStatus?: ChannelStatus;
  leadType?: LeadType;
  minScore?: number;
  search?: string;
}) {
  const db = getDb();
  
  const conditions = [];
  if (filters.pipelineStatus) conditions.push(eq(leads.pipelineStatus, filters.pipelineStatus));
  if (filters.channelStatus) conditions.push(eq(leads.channelStatus, filters.channelStatus));
  if (filters.leadType) conditions.push(eq(leads.leadType, filters.leadType));
  if (filters.minScore !== undefined) conditions.push(sql`${leads.icpScore} >= ${filters.minScore}`);
  
  if (filters.search) {
    const searchPattern = `%${filters.search}%`;
    conditions.push(
      or(
        like(leads.instagramHandle, searchPattern),
        like(leads.name, searchPattern),
        like(leads.bio, searchPattern)
      )
    );
  }
  
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  return db.select().from(leads).where(whereClause).orderBy(desc(leads.createdAt)).all();
}

export async function updateLead(id: string, data: UpdateLeadData) {
  const db = getDb();
  return db.update(leads)
    .set({ ...data, updatedAt: sql`(datetime('now'))` })
    .where(eq(leads.id, id))
    .returning()
    .get();
}

export async function updatePipelineStatus(id: string, newStatus: PipelineStatus, actor: AuditActor) {
  const db = getDb();
  
  return db.transaction(async (tx) => {
    const lead = await tx.update(leads)
      .set({ pipelineStatus: newStatus, updatedAt: sql`(datetime('now'))` })
      .where(eq(leads.id, id))
      .returning()
      .get();
      
    await tx.insert(auditLog).values({
      entityType: 'lead',
      entityId: id,
      action: `update_pipeline_status`,
      actor,
      details: JSON.stringify({ newStatus })
    }).run();
    
    return lead;
  });
}

export async function updateChannelStatus(id: string, newStatus: ChannelStatus, actor: AuditActor) {
  const db = getDb();
  
  return db.transaction(async (tx) => {
    const lead = await tx.update(leads)
      .set({ channelStatus: newStatus, updatedAt: sql`(datetime('now'))` })
      .where(eq(leads.id, id))
      .returning()
      .get();
      
    await tx.insert(auditLog).values({
      entityType: 'lead',
      entityId: id,
      action: `update_channel_status`,
      actor,
      details: JSON.stringify({ newStatus })
    }).run();
    
    return lead;
  });
}

export async function markDoNotContact(handle: string) {
  const db = getDb();
  const lead = await getLeadByHandle(handle);
  if (!lead) return null;

  return db.update(leads)
    .set({ 
      doNotContact: true, 
      channelStatus: 'do_not_contact',
      updatedAt: sql`(datetime('now'))`
    })
    .where(eq(leads.instagramHandle, handle))
    .returning()
    .get();
}

export async function getLeadStats() {
  const db = getDb();
  
  const byPipeline = await db.select({
    status: leads.pipelineStatus,
    count: count()
  }).from(leads).groupBy(leads.pipelineStatus).all();
  
  const byType = await db.select({
    type: leads.leadType,
    count: count()
  }).from(leads).groupBy(leads.leadType).all();
  
  const bySegment = await db.select({
    segment: leads.icpSegment,
    count: count()
  }).from(leads).where(sql`${leads.icpSegment} != ''`).groupBy(leads.icpSegment).all();
  
  return {
    pipeline: byPipeline,
    type: byType,
    segment: bySegment
  };
}

export async function getQualifiedLeadsForContact(limit: number) {
  const db = getDb();
  return db.select()
    .from(leads)
    .where(
      and(
        eq(leads.doNotContact, false),
        eq(leads.channelStatus, 'browser_contact_pending')
      )
    )
    .orderBy(desc(leads.icpScore))
    .limit(limit)
    .all();
}

export async function getLeadsNeedingFollowUp() {
  const db = getDb();
  return db.select()
    .from(leads)
    .where(
      and(
        eq(leads.doNotContact, false),
        lte(leads.nextFollowUpAt, sql`(datetime('now'))`)
      )
    )
    .all();
}
