import { Page } from 'playwright';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

export async function navigateToDirectInbox(page: Page): Promise<void> {
  await page.goto('https://www.instagram.com/direct/inbox/');
  await page.waitForTimeout(2000);
}

export async function dismissDialogs(page: Page): Promise<void> {
  try {
    const notNowBtn = page.getByRole('button', { name: /not now/i });
    if (await notNowBtn.isVisible({ timeout: 2000 })) {
      await notNowBtn.click();
    }
    
    // secondary not now for notifications
    const turnOnBtn = page.getByRole('button', { name: /turn on/i });
    if (await turnOnBtn.isVisible({ timeout: 1000 })) {
      const notNow2 = page.getByRole('button', { name: /not now/i });
      if (await notNow2.isVisible()) {
        await notNow2.click();
      }
    }
  } catch (error) {
    // Ignore dialog dismissal errors
  }
}

export async function openNewMessageDialog(page: Page): Promise<void> {
  await page.getByRole('button', { name: /new message/i }).click();
}

export async function searchAndSelectUser(page: Page, handle: string): Promise<void> {
  const searchInput = page.getByPlaceholder(/search/i).or(page.getByRole('textbox', { name: /search/i }));
  await searchInput.fill(handle);
  await page.waitForTimeout(1500); // Wait for search results
  
  const userOption = page.getByRole('checkbox', { name: new RegExp(handle, 'i') }).or(page.getByText(handle, { exact: true }));
  await userOption.first().click();
  
  await page.getByRole('button', { name: /chat|next/i }).click();
}

export async function typeMessage(page: Page, message: string): Promise<void> {
  const msgBox = page.getByRole('textbox', { name: /message/i });
  await msgBox.focus();
  await msgBox.pressSequentially(message, { delay: 40 + Math.random() * 40 }); // 40-80ms delay
}

export async function sendMessage(page: Page): Promise<void> {
  await page.keyboard.press('Enter');
}

export async function captureFailureContext(page: Page, jobId: string): Promise<{ screenshotPath: string; a11ySnapshot: unknown; url: string }> {
  const screenshotPath = `./screenshots/${jobId}.png`;
  mkdirSync(dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath });
  const a11ySnapshot = await (page as any).accessibility.snapshot();
  const url = page.url();
  return { screenshotPath, a11ySnapshot, url };
}
