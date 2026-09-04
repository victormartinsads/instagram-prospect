"use server";

import { getDb } from "@/db/connection";
import { leads, jobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const createLeadSchema = z.object({
  instagramHandle: z.string().min(1),
  name: z.string().optional(),
});

export async function createLeadAction(formData: FormData) {
  const data = createLeadSchema.parse({
    instagramHandle: formData.get("instagramHandle"),
    name: formData.get("name"),
  });
  
  const db = getDb();
  await db.insert(leads).values({
    instagramHandle: data.instagramHandle,
    name: data.name || "",
  });
}

export async function updateLeadAction(id: string, data: any) {
  const db = getDb();
  await db.update(leads).set(data).where(eq(leads.id, id));
}

export async function markDoNotContactAction(id: string) {
  const db = getDb();
  await db.update(leads).set({ doNotContact: true }).where(eq(leads.id, id));
}

export async function enqueueQualifyAction(leadId: string) {
  const db = getDb();
  await db.insert(jobs).values({ type: "qualify_lead", payload: JSON.stringify({ leadId }) });
}

export async function enqueueContactAction(leadId: string) {
  const db = getDb();
  await db.insert(jobs).values({ type: "send_first_dm", payload: JSON.stringify({ leadId }) });
}
