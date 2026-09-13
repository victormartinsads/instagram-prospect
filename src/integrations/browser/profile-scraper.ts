import { Page } from 'playwright';

export interface ProfileData {
  name: string;
  username: string;
  bio: string;
  category: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  isVerified: boolean;
  isBusinessAccount: boolean;
  profileUrl: string;
  recentHashtags: string[];
}

function parseMetricCount(str: string): number {
  if (!str) return 0;
  const cleaned = str.trim().toLowerCase().replace(/\s+/g, '');
  
  if (cleaned.includes('m') || cleaned.includes('mi')) {
    const num = parseFloat(cleaned.replace(/[^\d,.]/g, '').replace(',', '.'));
    return Math.round(num * 1000000);
  }
  if (cleaned.includes('k') || cleaned.includes('mil')) {
    const num = parseFloat(cleaned.replace(/[^\d,.]/g, '').replace(',', '.'));
    return Math.round(num * 1000);
  }
  const num = parseInt(cleaned.replace(/[^\d]/g, ''), 10);
  return isNaN(num) ? 0 : num;
}

export async function scrapeProfile(page: Page, handle: string): Promise<ProfileData> {
  const profileUrl = `https://www.instagram.com/${handle}/`;
  await page.goto(profileUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  let name = handle;
  let bio = "";
  let category = "";
  let followerCount = 0;
  let followingCount = 0;
  let postCount = 0;
  let isVerified = false;
  let isBusinessAccount = false;
  const recentHashtags: string[] = [];

  try {
    // 1. Extract from meta description (most reliable and concise on Instagram)
    const metaDesc = await page.locator('meta[name="description"]').getAttribute('content').catch(() => null);
    if (metaDesc) {
      // Example: "22K seguidores, 971 seguindo, 425 posts — Carolina Tavares | Dentista em São Paulo - SP (@dentistacaroltavares) no Instagram: \"...\""
      const followersMatch = metaDesc.match(/([\d.,]+(?:\s*(?:mil|k|m|mi))?)\s+seguidores/i) ||
                             metaDesc.match(/([\d.,]+(?:\s*(?:k|m))?)\s+followers/i);
      if (followersMatch) {
        followerCount = parseMetricCount(followersMatch[1]);
      }

      const followingMatch = metaDesc.match(/([\d.,]+(?:\s*(?:mil|k|m|mi))?)\s+seguindo/i) ||
                             metaDesc.match(/([\d.,]+(?:\s*(?:k|m))?)\s+following/i);
      if (followingMatch) {
        followingCount = parseMetricCount(followingMatch[1]);
      }

      const postsMatch = metaDesc.match(/([\d.,]+)\s+(?:posts|publicações|publicacoes)/i);
      if (postsMatch) {
        postCount = parseMetricCount(postsMatch[1]);
      }

      // Extract Name and Bio from meta description
      const nameBioMatch = metaDesc.match(/(?:—|-)\s*(.*?)\s*\(@[^)]+\)(?:\s*(?:no Instagram|on Instagram))?:\s*["“](.*)["”]?/s);
      if (nameBioMatch) {
        name = nameBioMatch[1].trim() || name;
        bio = nameBioMatch[2].trim() || bio;
      }
    }

    // 2. Extract or enhance from header element if bio/name are still sparse
    const header = page.locator('header').first();
    if (await header.count() > 0) {
      const headerText = await header.innerText().catch(() => '');
      
      // Look for verification badge
      const verified = header.locator('svg[aria-label*="Verificado" i], svg[aria-label*="Verified" i]').first();
      if (await verified.count() > 0) {
        isVerified = true;
      }

      // Fallback for bio if meta description didn't provide full bio
      if (!bio && headerText) {
        const lines = headerText.split('\n').map(l => l.trim()).filter(Boolean);
        // Exclude handles and counts
        const contentLines = lines.filter(l => 
          !l.includes(handle) && 
          !l.match(/^\d+.*(?:posts|publicações|seguidores|seguindo)/i) &&
          !l.match(/^(seguir|mensagem|enviar mensagem|following|message)/i)
        );
        bio = contentLines.slice(0, 5).join(' ');
      }
    }

    // Check for hashtags in bio
    if (bio) {
      const matches = bio.match(/#[a-zA-Z0-9_]+/g);
      if (matches) {
        recentHashtags.push(...matches.slice(0, 5));
      }
    }

    // Business indicator: has Enviar Mensagem, Link in bio, or category
    isBusinessAccount = followerCount > 500 || /dr|dra|clínica|clinica|odonto|médic|estétic|crm|cro/i.test(name + ' ' + bio);

  } catch (error) {
    console.error(`[SCRAPER] Error extracting data for @${handle}:`, error);
  }

  return {
    name,
    username: handle,
    bio,
    category,
    followerCount,
    followingCount,
    postCount,
    isVerified,
    isBusinessAccount,
    profileUrl,
    recentHashtags
  };
}
