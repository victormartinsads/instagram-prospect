'use server';

import { getDb } from '@/db/connection';
import { jobs } from '@/db/schema';
import { eq, and, desc, sql, lte, or, count } from 'drizzle-orm';
import { JobType } from '@/lib/types';
import crypto from 'crypto';

export async function enqueueJob(type: JobType, payload: any, scheduledAt?: string) {
  const db = getDb();
  return db.insert(jobs)
    .values({
      type,
      payload: JSON.stringify(payload),
      scheduledAt: scheduledAt || sql`(datetime('now'))`
    })
    .returning()
    .get();
}

export async function dequeueJob() {
  const db = getDb();
  
  return db.transaction(async (tx) => {
    const lockKey = crypto.randomUUID();
    
    // Find next pending job ready to run
    const job = await tx.select()
      .from(jobs)
      .where(
        and(
          eq(jobs.status, 'pending'),
          lte(jobs.scheduledAt, sql`(datetime('now'))`)
        )
      )
      .orderBy(jobs.scheduledAt)
      .limit(1)
      .get();
      
    if (!job) return null;
    
    // Update status and lock
    const updated = await tx.update(jobs)
      .set({
        status: 'running',
        startedAt: sql`(datetime('now'))`,
        lockKey,
        updatedAt: sql`(datetime('now'))`
      })
      .where(eq(jobs.id, job.id))
      .returning()
      .get();
      
    return updated;
  });
}

export async function completeJob(id: string, result?: any) {
  const db = getDb();
  return db.update(jobs)
    .set({
      status: 'completed',
      completedAt: sql`(datetime('now'))`,
      result: result ? JSON.stringify(result) : null,
      updatedAt: sql`(datetime('now'))`
    })
    .where(eq(jobs.id, id))
    .returning()
    .get();
}

export async function failJob(id: string, error: Error | string) {
  const db = getDb();
  const errorMessage = error instanceof Error ? error.message : error;
  
  return db.transaction(async (tx) => {
    const job = await tx.select().from(jobs).where(eq(jobs.id, id)).get();
    if (!job) return null;
    
    const newAttempts = job.attempts + 1;
    const isMaxAttempts = newAttempts >= job.maxAttempts;
    
    return tx.update(jobs)
      .set({
        status: isMaxAttempts ? 'failed' : 'pending',
        error: errorMessage,
        attempts: newAttempts,
        updatedAt: sql`(datetime('now'))`,
        lockKey: null // release lock
      })
      .where(eq(jobs.id, id))
      .returning()
      .get();
  });
}

export async function deadLetterJob(id: string, error: Error | string) {
  const db = getDb();
  const errorMessage = error instanceof Error ? error.message : error;
  
  return db.update(jobs)
    .set({
      status: 'dead_letter',
      error: errorMessage,
      updatedAt: sql`(datetime('now'))`,
      lockKey: null
    })
    .where(eq(jobs.id, id))
    .returning()
    .get();
}

export async function getJobStats() {
  const db = getDb();
  
  const byStatus = await db.select({
    status: jobs.status,
    count: count()
  }).from(jobs).groupBy(jobs.status).all();
  
  const byType = await db.select({
    type: jobs.type,
    count: count()
  }).from(jobs).groupBy(jobs.type).all();
  
  return { byStatus, byType };
}

export async function getPendingJobs(type?: JobType) {
  const db = getDb();
  
  let query = db.select().from(jobs).where(or(eq(jobs.status, 'pending'), eq(jobs.status, 'running')));
  
  // NOTE: drizzle does not let us easily dynamically add where clauses to an already created select builder if it already has one without using `and` correctly. So we do it this way.
  
  const conditions = [or(eq(jobs.status, 'pending'), eq(jobs.status, 'running'))];
  if (type) conditions.push(eq(jobs.type, type));
  
  return db.select()
    .from(jobs)
    .where(and(...conditions))
    .orderBy(desc(jobs.scheduledAt))
    .all();
}

export async function getDeadLetterJobs() {
  const db = getDb();
  return db.select()
    .from(jobs)
    .where(eq(jobs.status, 'dead_letter'))
    .orderBy(desc(jobs.updatedAt))
    .all();
}

export async function resetOrphanedJobs() {
  const db = getDb();
  // stuck in 'running' for >10min
  return db.update(jobs)
    .set({
      status: 'pending',
      lockKey: null,
      updatedAt: sql`(datetime('now'))`
    })
    .where(
      and(
        eq(jobs.status, 'running'),
        lte(jobs.updatedAt, sql`(datetime('now', '-10 minutes'))`)
      )
    )
    .run();
}
