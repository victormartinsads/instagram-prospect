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

export async function scrapeProfile(page: Page, handle: string): Promise<ProfileData> {
  const profileUrl = `https://www.instagram.com/${handle}/`;
  await page.goto(profileUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const snapshot = await (page as any).accessibility.snapshot();
  
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
    const nameEl = await page.getByRole('heading', { level: 1 }).first();
    if (nameEl) name = await nameEl.innerText();
    
    // Attempt fallback data extraction if a11y tree doesn't provide it
    const followersEl = await page.getByText(/followers/i).first();
    if (followersEl) {
      const text = await followersEl.innerText();
      followerCount = parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
    }

    const verifiedEl = await page.getByText(/verified/i).first();
    if (verifiedEl) {
      isVerified = true;
    }
  } catch (error) {
    console.error('Error during fallback extraction', error);
  }

  // Parse accessibility snapshot for more detailed extraction if necessary
  if (snapshot) {
    // Traverse snapshot.children...
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
