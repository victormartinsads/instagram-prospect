'use server';

import { getDb } from '@/db/connection';
import { experiments, experimentVariants, leads } from '@/db/schema';
import { eq, and, sql, desc, asc } from 'drizzle-orm';
import { ExperimentStatus } from '@/lib/types';

export type CreateExperimentData = typeof experiments.$inferInsert & {
  variants: Omit<typeof experimentVariants.$inferInsert, 'experimentId'>[];
};

export async function createExperiment(data: CreateExperimentData) {
  const db = getDb();
  
  return db.transaction(async (tx) => {
    const { variants, ...expData } = data;
    
    const exp = await tx.insert(experiments).values(expData).returning().get();
    
    const variantsToInsert = variants.map(v => ({
      ...v,
      experimentId: exp.id,
      value: typeof v.value === 'string' ? v.value : JSON.stringify(v.value)
    }));
    
    await tx.insert(experimentVariants).values(variantsToInsert).run();
    
    return exp;
  });
}

export async function getRunningExperiments(funnel?: string) {
  const db = getDb();
  const conditions = [eq(experiments.status, 'running')];
  if (funnel) conditions.push(eq(experiments.funnel, funnel));
  
  return db.select()
    .from(experiments)
    .where(and(...conditions))
    .all();
}

export async function assignVariant(experimentId: string, leadId: string) {
  const db = getDb();
  
  return db.transaction(async (tx) => {
    // Pick least-assigned variant
    const variant = await tx.select()
      .from(experimentVariants)
      .where(eq(experimentVariants.experimentId, experimentId))
      .orderBy(asc(experimentVariants.assignedCount))
      .limit(1)
      .get();
      
    if (!variant) return null;
    
    // Increment assignedCount
    await tx.update(experimentVariants)
      .set({ 
        assignedCount: sql`${experimentVariants.assignedCount} + 1`,
        updatedAt: sql`(datetime('now'))`
      })
      .where(eq(experimentVariants.id, variant.id))
      .run();
      
    // Update experiment sample size
    await tx.update(experiments)
      .set({
        currentSampleSize: sql`${experiments.currentSampleSize} + 1`,
        updatedAt: sql`(datetime('now'))`
      })
      .where(eq(experiments.id, experimentId))
      .run();
      
    // Assign to lead
    await tx.update(leads)
      .set({ 
        experimentGroupId: variant.id,
        updatedAt: sql`(datetime('now'))`
      })
      .where(eq(leads.id, leadId))
      .run();
      
    return variant;
  });
}

export async function recordConversion(variantId: string) {
  const db = getDb();
  
  return db.transaction(async (tx) => {
    const variant = await tx.select().from(experimentVariants).where(eq(experimentVariants.id, variantId)).get();
    if (!variant) return null;
    
    const newConversionCount = variant.conversionCount + 1;
    const newConversionRate = variant.assignedCount > 0 ? (newConversionCount / variant.assignedCount) : 0;
    
    return tx.update(experimentVariants)
      .set({
        conversionCount: newConversionCount,
        conversionRate: newConversionRate,
        updatedAt: sql`(datetime('now'))`
      })
      .where(eq(experimentVariants.id, variantId))
      .returning()
      .get();
  });
}

export async function getExperimentResults(experimentId: string) {
  const db = getDb();
  
  const exp = await db.select().from(experiments).where(eq(experiments.id, experimentId)).get();
  if (!exp) return null;
  
  const variants = await db.select().from(experimentVariants).where(eq(experimentVariants.experimentId, experimentId)).all();
  
  return {
    ...exp,
    variants
  };
}

export async function concludeExperiment(experimentId: string, winnerId: string, conclusion: string) {
  const db = getDb();
  
  return db.update(experiments)
    .set({
      status: 'concluded',
      winnerVariantId: winnerId,
      conclusion,
      concludedAt: sql`(datetime('now'))`,
      updatedAt: sql`(datetime('now'))`
    })
    .where(eq(experiments.id, experimentId))
    .returning()
    .get();
}
