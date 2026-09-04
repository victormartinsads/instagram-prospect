import { getDb } from "@/db/connection";
import { experiments, experimentVariants, leads } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function createDefaultExperiment() {
  const db = getDb();
  
  const [exp] = await db.insert(experiments).values({
    name: "First Message Test",
    funnel: "client",
    variable: "first_message",
    hypothesis: "A shorter message converts better",
    status: "running"
  }).returning();
  
  await db.insert(experimentVariants).values([
    { experimentId: exp.id, name: "Control", value: JSON.stringify({ template: "default" }), isControl: true },
    { experimentId: exp.id, name: "Short", value: JSON.stringify({ template: "short" }) }
  ]);
  
  return exp;
}

export async function assignVariantToLead(leadId: string) {
  const db = getDb();
  
  const [exp] = await db.select().from(experiments).where(eq(experiments.status, "running")).limit(1);
  if (!exp) return null;
  
  const variants = await db.select().from(experimentVariants).where(eq(experimentVariants.experimentId, exp.id));
  if (variants.length === 0) return null;
  
  // simple round robin or random
  const assigned = variants[Math.floor(Math.random() * variants.length)];
  
  await db.update(experimentVariants).set({ assignedCount: sql`${experimentVariants.assignedCount} + 1` }).where(eq(experimentVariants.id, assigned.id));
  
  return assigned.id;
}

export async function recordConversionEvent(leadId: string, event: string) {
  const db = getDb();
  
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead || !lead.experimentGroupId) return;
  
  await db.update(experimentVariants).set({ 
    conversionCount: sql`${experimentVariants.conversionCount} + 1`,
    conversionRate: sql`CAST((${experimentVariants.conversionCount} + 1) AS REAL) / ${experimentVariants.assignedCount}`
  }).where(eq(experimentVariants.id, lead.experimentGroupId));
}
