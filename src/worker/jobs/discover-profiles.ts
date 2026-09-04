import { getDb } from "@/db/connection";
import { leads, jobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { scoreIcp } from "@/integrations/openai/conversation-engine";
import { connectBrowser, disconnectBrowser } from "@/integrations/browser/connection";
import { scrapeProfile } from "@/integrations/browser/profile-scraper";

export async function executeDiscoverProfiles(payload: any) {
  const { keyword } = payload;
  const db = getDb();

  console.log(`[WORKER] Starting profile discovery for keyword: "${keyword}"`);

  let page: any = null;
  try {
    const browser = await connectBrowser();
    const context = browser.contexts()[0];
    if (!context) {
      console.warn("[WORKER] No active Chrome context found. Ensure Chrome is opened on port 9222 and logged in.");
      return;
    }

    page = await context.newPage();

    // Navigate to Instagram search for the keyword
    const searchUrl = `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(keyword)}`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(4000);

    // Extract profile handles from search results
    const links = await page.$$eval("a[href]", (elements: HTMLAnchorElement[]) => {
      const handles: string[] = [];
      for (const el of elements) {
        const href = el.getAttribute("href") || "";
        // Match Instagram profile paths like "/clinica.odontologica/"
        const match = href.match(/^\/([a-zA-Z0-9_.]+)\/$/);
        if (match && !["explore", "reels", "direct", "stories", "accounts"].includes(match[1])) {
          handles.push(match[1]);
        }
      }
      return Array.from(new Set(handles)).slice(0, 5); // Limit to top 5 candidates per run
    });

    console.log(`[WORKER] Found ${links.length} profiles for keyword "${keyword}":`, links);

    for (const handle of links) {
      const existing = await db.select().from(leads).where(eq(leads.instagramHandle, handle)).limit(1);
      if (existing.length > 0) continue;

      try {
        const profile = await scrapeProfile(page, handle);
        const profileData = JSON.stringify(profile);
        const scoreResult = await scoreIcp(profileData);

        const isQualified = scoreResult.score >= 30;
        const pipelineStatus = isQualified ? "qualified" : "discovered";

        const insertedLeads = await db.insert(leads).values({
          instagramHandle: handle,
          name: profile.name || handle,
          bio: profile.bio || "",
          followerCount: profile.followerCount || 0,
          profileUrl: profile.profileUrl,
          pipelineStatus,
          channelStatus: isQualified ? "browser_contact_pending" : "browser_contact_pending",
          icpScore: scoreResult.score,
          icpSegment: scoreResult.segment || keyword,
          detectedRole: scoreResult.detectedRole,
          source: "keyword_search",
          sourceKeyword: keyword,
        }).returning();

        const lead = insertedLeads[0];
        console.log(`[WORKER] Discovered lead @${handle} - ICP Score: ${scoreResult.score}/100 (${pipelineStatus})`);

        // If qualified, enqueue send_first_dm job immediately!
        if (isQualified && lead) {
          await db.insert(jobs).values({
            type: "send_first_dm",
            payload: JSON.stringify({ leadId: lead.id }),
            status: "pending",
          });
        }
      } catch (err) {
        console.error(`[WORKER] Failed to process profile @${handle}:`, err);
      }
    }
  } catch (error) {
    console.error(`[WORKER] Error in discoverProfiles for keyword "${keyword}":`, error);
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
    await disconnectBrowser().catch(() => {});
  }
}
