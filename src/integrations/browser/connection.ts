import { chromium, Browser } from 'playwright';
import { getEnvConfig } from '@/lib/config';
import { BrowserUnavailableError } from '@/lib/errors';
import { getDb } from '@/db/connection';
import { systemState } from '@/db/schema';
import { sql } from 'drizzle-orm';

let _browser: Browser | null = null;

export async function connectBrowser(): Promise<Browser> {
  if (_browser && _browser.isConnected()) return _browser;

  try {
    const config = getEnvConfig();
    _browser = await chromium.connectOverCDP(config.CHROME_CDP_URL);
    return _browser;
  } catch (error: unknown) {
    const db = getDb();
    const reason = error instanceof Error ? error.message : String(error);
    
    await db.insert(systemState)
      .values({
        key: 'browser_unavailable',
        value: JSON.stringify({ reason, timestamp: new Date().toISOString() }),
      })
      .onConflictDoUpdate({
        target: systemState.key,
        set: {
          value: JSON.stringify({ reason, timestamp: new Date().toISOString() }),
          updatedAt: sql`(datetime('now'))`,
        }
      });
      
    throw new BrowserUnavailableError(reason);
  }
}

export async function disconnectBrowser(): Promise<void> {
  if (_browser && _browser.isConnected()) {
    // @ts-ignore - gracefully disconnect without closing browser
    if (typeof (_browser as any).disconnect === 'function') {
      await (_browser as any).disconnect();
    } else {
      await _browser.close();
    }
  }
  _browser = null;
}

export function isBrowserConnected(): boolean {
  return _browser !== null && _browser.isConnected();
}
