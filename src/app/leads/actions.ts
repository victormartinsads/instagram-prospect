'use server';

import { runDiscoveryCycle } from '@/features/campaigns/manager';
import { revalidatePath } from 'next/cache';

export async function triggerDiscoveryAction() {
  await runDiscoveryCycle();
  revalidatePath('/leads');
  revalidatePath('/');
  return { success: true };
}
