import { Page } from 'playwright';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

export async function navigateToDirectInbox(page: Page): Promise<void> {
  await page.goto('https://www.instagram.com/direct/inbox/');
  await page.waitForTimeout(2000);
}

export async function dismissDialogs(page: Page): Promise<void> {
  try {
    const notNowBtn = page.locator('button:has-text("Agora não"), button:has-text("Not now"), button:has-text("Not Now"), button:has-text("Cancelar")').first();
    if (await notNowBtn.isVisible({ timeout: 2000 })) {
      await notNowBtn.click();
    }
  } catch (error) {
    // Ignore dialog dismissal errors
  }
}

export async function openDirectFromProfile(page: Page, handle: string): Promise<boolean> {
  await page.goto(`https://www.instagram.com/${handle}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  const msgBtn = page.locator('div[role="button"]:has-text("Enviar mensagem"), button:has-text("Enviar mensagem"), button:has-text("Message")').first();
  if (await msgBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await msgBtn.click();
    await page.waitForTimeout(3000);
    await dismissDialogs(page);
    return true;
  }
  return false;
}

export async function typeMessage(page: Page, message: string): Promise<void> {
  const msgBox = page.locator('div[role="textbox"], div[contenteditable="true"], textarea[placeholder*="Mensagem"], textarea[placeholder*="Message"]').first();
  await msgBox.waitFor({ state: 'visible', timeout: 5000 });
  await msgBox.focus();
  await msgBox.pressSequentially(message, { delay: 40 + Math.random() * 40 }); // 40-80ms delay
  await page.waitForTimeout(1000);
}

export async function sendMessage(page: Page): Promise<void> {
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);
}

export async function captureFailureContext(page: Page, jobId: string): Promise<{ screenshotPath: string; a11ySnapshot: unknown; url: string }> {
  const screenshotPath = `./screenshots/${jobId}.png`;
  mkdirSync(dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath });
  const a11ySnapshot = await (page as any).accessibility.snapshot();
  const url = page.url();
  return { screenshotPath, a11ySnapshot, url };
}
