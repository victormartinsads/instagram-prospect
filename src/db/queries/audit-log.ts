'use server';

import { getDb } from '@/db/connection';
import { auditLog } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { AuditActor } from '@/lib/types';

export async function appendAuditLog(entityType: string, entityId: string, action: string, actor: AuditActor, details?: any) {
  const db = getDb();
  return db.insert(auditLog)
    .values({
      entityType,
      entityId,
      action,
      actor,
      details: details ? JSON.stringify(details) : '{}'
    })
    .returning()
    .get();
}

export async function getAuditLog(entityType: string, entityId: string, limit: number = 50) {
  const db = getDb();
  return db.select()
    .from(auditLog)
    .where(and(eq(auditLog.entityType, entityType), eq(auditLog.entityId, entityId)))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
    .all();
}

export async function getRecentAuditLog(limit: number = 50) {
  const db = getDb();
  return db.select()
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
    .all();
}
