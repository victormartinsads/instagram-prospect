import { getDb } from "@/db/connection";
import { leads, jobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { scoreIcp } from "@/integrations/openai/conversation-engine";
import { connectBrowser, disconnectBrowser } from "@/integrations/browser/connection";
import { scrapeProfile } from "@/integrations/browser/profile-scraper";

export async function executeDiscoverProfiles(payload: any) {
  const { keyword } = payload;
  const db = getDb();

  console.log(`[WORKER] Iniciando busca no Instagram pela palavra-chave: "${keyword}"`);

  let page: any = null;
  try {
    const browser = await connectBrowser();
    const context = browser.contexts()[0];
    if (!context) {
      console.warn("[WORKER] Nenhum contexto do Chrome encontrado na porta 9222.");
      return;
    }

    page = await context.newPage();

    // 1. Navegar até a página inicial do Instagram
    await page.goto("https://www.instagram.com/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // 2. Abrir o painel de Pesquisa lateral do Instagram
    const searchNav = page.locator('a[href="#"]:has-text("Pesquisa"), a[href="#"]:has-text("Search"), svg[aria-label="Pesquisa"], svg[aria-label="Search"]').first();
    if (await searchNav.count() > 0) {
      await searchNav.click().catch(() => {});
      await page.waitForTimeout(2000);
    }

    // 3. Localizar a barra de pesquisa
    const searchInput = page.locator('input[placeholder*="Pesquisa"], input[placeholder*="Search"], input[aria-label*="pesquisa" i], input[aria-label*="search" i]').first();
    
    let candidateHandles: string[] = [];

    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill(keyword);
      await page.waitForTimeout(3500);

      // 4. Extrair os perfis sugeridos nos resultados da pesquisa
      candidateHandles = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href]'));
        const handles: string[] = [];
        const ignored = new Set(['explore', 'reels', 'direct', 'stories', 'accounts', 'popular', 'legal', 'about', 'help', 'press', 'api', 'jobs', 'privacy', 'terms', 'locations', 'directory', 'victormartins.io']);
        
        for (const a of anchors) {
          const href = a.getAttribute('href') || '';
          const match = href.match(/^\/([a-zA-Z0-9_.]+)\/$/);
          if (match) {
            const handle = match[1].toLowerCase();
            if (!ignored.has(handle) && !handles.includes(handle)) {
              handles.push(handle);
            }
          }
        }
        return handles;
      });
    }

    console.log(`[WORKER] Encontrados ${candidateHandles.length} perfis candidatos para "${keyword}":`, candidateHandles);

    // Limitar a até 5 perfis por ciclo de palavra-chave para manter aquecimento suave
    const selectedHandles = candidateHandles.slice(0, 5);

    for (const handle of selectedHandles) {
      // Ignorar se já existir no banco
      const existing = await db.select().from(leads).where(eq(leads.instagramHandle, handle)).limit(1);
      if (existing.length > 0) {
        console.log(`[WORKER] Lead @${handle} já cadastrado no banco, pulando.`);
        continue;
      }

      try {
        console.log(`[WORKER] Analisando perfil @${handle}...`);
        const profile = await scrapeProfile(page, handle);
        const profileData = JSON.stringify(profile);
        
        // Avaliação de ICP com IA (Gemini / OpenAI)
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
        console.log(`[WORKER] Lead salvo: @${handle} - Score ICP: ${scoreResult.score}/100 [${pipelineStatus}]`);

        // Se qualificado, enfileira o envio da primeira DM
        if (isQualified && lead) {
          await db.insert(jobs).values({
            type: "send_first_dm",
            payload: JSON.stringify({ leadId: lead.id }),
            status: "pending",
          });
          console.log(`[WORKER] Job de envio de DM enfileirado para @${handle}`);
        }

        // Intervalo humano de 3 a 5 segundos entre análises
        await page.waitForTimeout(3000 + Math.random() * 2000);
      } catch (err) {
        console.error(`[WORKER] Falha ao processar perfil @${handle}:`, err);
      }
    }
  } catch (error) {
    console.error(`[WORKER] Erro em discoverProfiles para "${keyword}":`, error);
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
    await disconnectBrowser().catch(() => {});
  }
}
