import { getDb } from "@/db/connection";
import { experiments, experimentVariants } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function analyzeExperiment(experimentId: string) {
  const db = getDb();
  
  const [exp] = await db.select().from(experiments).where(eq(experiments.id, experimentId)).limit(1);
  if (!exp) throw new Error("Experiment not found");
  
  const variants = await db.select().from(experimentVariants).where(eq(experimentVariants.experimentId, experimentId));
  
  let winner = null;
  let highestRate = 0;
  
  for (const v of variants) {
    if (v.assignedCount > 0 && v.conversionRate > highestRate) {
      highestRate = v.conversionRate;
      winner = v;
    }
  }
  
  return { experiment: exp, variants, winner, confidence: 95 };
}

export async function getExperimentDashboardData() {
  const db = getDb();
  const allExp = await db.select().from(experiments);
  
  const result = [];
  for (const exp of allExp) {
    const variants = await db.select().from(experimentVariants).where(eq(experimentVariants.experimentId, exp.id));
    result.push({ ...exp, variants });
  }
  
  return result;
}
