'use server';

import { getDb } from '@/db/connection';
import { aiCalls, leads } from '@/db/schema';
import { eq, sql, sum, avg, count } from 'drizzle-orm';
import { AiCallPurpose } from '@/lib/types';

export async function recordAiCall(data: typeof aiCalls.$inferInsert) {
  const db = getDb();
  return db.insert(aiCalls).values(data).returning().get();
}

export async function getMonthlySpend() {
  const db = getDb();
  const result = await db.select({
    totalUsd: sum(aiCalls.estimatedCostUsd)
  })
  .from(aiCalls)
  .where(
    sql`strftime('%Y-%m', ${aiCalls.createdAt}) = strftime('%Y-%m', 'now')`
  )
  .get();
  
  return result?.totalUsd || 0;
}

export async function getCostPerLead() {
  const db = getDb();
  
  // Total cost / number of unique leads that have aiCalls
  const costResult = await db.select({
    totalUsd: sum(aiCalls.estimatedCostUsd),
    uniqueLeads: count(sql`DISTINCT ${aiCalls.leadId}`)
  })
  .from(aiCalls)
  .where(sql`${aiCalls.leadId} IS NOT NULL`)
  .get();
  
  if (!costResult || costResult.uniqueLeads === 0) return 0;
  
  return Number(costResult.totalUsd || 0) / Number(costResult.uniqueLeads || 1);
}

export async function getCostPerConversion() {
  const db = getDb();
  
  // Find leads that are active_customer
  const convertedLeadsCost = await db.select({
    totalUsd: sum(aiCalls.estimatedCostUsd)
  })
  .from(aiCalls)
  .innerJoin(leads, eq(aiCalls.leadId, leads.id))
  .where(eq(leads.pipelineStatus, 'active_customer'))
  .get();
  
  const convertedCount = await db.select({
    c: count()
  })
  .from(leads)
  .where(eq(leads.pipelineStatus, 'active_customer'))
  .get();
  
  if (!convertedCount || convertedCount.c === 0) return 0;
  
  return Number(convertedLeadsCost?.totalUsd || 0) / Number(convertedCount.c || 1);
}

export async function getCostBreakdown() {
  const db = getDb();
  
  return db.select({
    model: aiCalls.model,
    purpose: aiCalls.purpose,
    totalUsd: sum(aiCalls.estimatedCostUsd),
    callCount: count()
  })
  .from(aiCalls)
  .groupBy(aiCalls.model, aiCalls.purpose)
  .all();
}
