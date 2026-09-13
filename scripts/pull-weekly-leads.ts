import { getDb, querySql } from "../src/db/connection";
import { executeDiscoverProfiles } from "../src/worker/jobs/discover-profiles";
import { getBusinessConfig } from "../src/lib/config";

async function main() {
  console.log("=== INICIANDO COLETA INTENSIVA DE LEADS PARA A SEMANA — ORBITA IO ===");

  const biz = getBusinessConfig();
  const keywords = biz.icp.keywords;

  console.log(`Total de palavras-chave a processar: ${keywords.length}`);

  for (let i = 0; i < keywords.length; i++) {
    const keyword = keywords[i];
    console.log(`\n[${i + 1}/${keywords.length}] Executando busca: "${keyword}"`);
    try {
      await executeDiscoverProfiles({ keyword });
      const currentLeads = await querySql("SELECT count(*) as total FROM leads");
      console.log(`[Status] Total acumulado de leads no Kanban: ${currentLeads.rows[0].total}`);
    } catch (err) {
      console.error(`Erro ao processar keyword "${keyword}":`, err);
    }
  }

  console.log("\n=== COLETA FINALIZADA COM SUCESSO! ===");
  const finalSummary = await querySql("SELECT pipeline_status, count(*) as count FROM leads GROUP BY pipeline_status");
  console.table(finalSummary.rows);
}

main().catch(console.error);
