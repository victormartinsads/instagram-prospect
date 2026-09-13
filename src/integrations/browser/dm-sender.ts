import { connectBrowser, disconnectBrowser } from './connection';
import { 
  openDirectFromProfile, 
  typeMessage, 
  sendMessage, 
  captureFailureContext 
} from './instagram-actions';
import { getDb } from '@/db/connection';
import { messages, leads, conversations } from '@/db/schema';
import { eq } from 'drizzle-orm';
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
    let page: any = null;
    try {
      const browser = await connectBrowser();
      const context = browser.contexts()[0];
      if (!context) {
        throw new Error('No browser context available');
      }

      page = await context.newPage();
      
      // Delay simulating human reading profile
      await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));

      const opened = await openDirectFromProfile(page, handle);
      if (!opened) {
        throw new Error(`Could not find "Enviar mensagem" on profile @${handle}`);
      }

      await typeMessage(page, message);
      await sendMessage(page);

      // Ensure a conversation record exists in the database
      const existingConv = await db.select().from(conversations).where(eq(conversations.leadId, leadId)).limit(1);
      let conversationId = existingConv[0]?.id;
      if (!conversationId) {
        const insertedConv = await db.insert(conversations).values({
          leadId,
          channel: 'browser',
          status: 'active',
        }).returning();
        conversationId = insertedConv[0].id;
      }

      // Record outbound message
      await db.insert(messages).values({
        conversationId,
        leadId,
        direction: 'outbound',
        channel: 'browser',
        content: message,
        variantId,
      });

      // Update lead pipeline to contacted and waiting reply
      await db.update(leads)
        .set({ 
          pipelineStatus: 'contacted',
          channelStatus: 'waiting_inbound_reply' 
        })
        .where(eq(leads.id, leadId));

      await recordDMSent();
      console.log(`[DM-SENDER] First DM successfully sent to @${handle}`);
      
    } catch (error) {
      if (page) {
        await captureFailureContext(page, leadId).catch(() => {});
      }
      console.error(`[DM-SENDER] Failed to send DM to @${handle}:`, error);
      throw error;
    } finally {
      if (page) {
        await page.close().catch(() => {});
      }
      await disconnectBrowser().catch(() => {});
    }
  });
}
