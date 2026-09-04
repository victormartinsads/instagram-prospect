import { connectBrowser, disconnectBrowser } from './connection';
import { 
  navigateToDirectInbox, 
  dismissDialogs, 
  openNewMessageDialog, 
  searchAndSelectUser, 
  typeMessage, 
  sendMessage, 
  captureFailureContext 
} from './instagram-actions';
import { getDb } from '@/db/connection';
import { messages, leads } from '@/db/schema';
import { eq } from 'drizzle-orm';
// @ts-ignore - Assuming these modules exist as requested
import { canSendDM, recordDMSent } from '@/lib/rate-limiter';

let browserMutex = Promise.resolve();

export function withBrowserMutex<T>(fn: () => Promise<T>): Promise<T> {
  const current = browserMutex;
  let release: () => void;
  browserMutex = new Promise(r => release = r);
  return current.then(fn).finally(() => release!());
}

export async function sendFirstDM(handle: string, message: string, leadId: string, variantId?: string): Promise<void> {
  const rateLimitCheck = await canSendDM();
  if (!rateLimitCheck.allowed) {
    throw new Error(`Rate limit exceeded: ${rateLimitCheck.reason}`);
  }

  const db = getDb();
  const leadResult = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  const lead = leadResult[0];

  if (!lead) {
    throw new Error(`Lead ${leadId} not found`);
  }

  if (lead.doNotContact) {
    throw new Error(`Lead ${handle} is marked as doNotContact`);
  }

  return withBrowserMutex(async () => {
    let page = null;
    try {
      const browser = await connectBrowser();
      const context = browser.contexts()[0];
      if (!context) {
        throw new Error('No browser context available');
      }

      page = await context.newPage();
      
      // Random delay simulating reading
      await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));

      await navigateToDirectInbox(page);
      await dismissDialogs(page);
      await openNewMessageDialog(page);
      await searchAndSelectUser(page, handle);
      await typeMessage(page, message);
      await sendMessage(page);

      const conversationId = leadId; // Typically conversation relates to lead directly

      await db.insert(messages).values({
        conversationId,
        leadId,
        direction: 'outbound',
        channel: 'browser',
        content: message,
        variantId,
      });

      await db.update(leads)
        .set({ channelStatus: 'waiting_inbound_reply' })
        .where(eq(leads.id, leadId));

      await recordDMSent();
      
    } catch (error) {
      if (page) {
        await captureFailureContext(page, leadId);
      }
      console.error(`Failed to send DM to ${handle}:`, error);
      throw error;
    } finally {
      if (page) {
        await page.close();
      }
      await disconnectBrowser();
    }
  });
}
