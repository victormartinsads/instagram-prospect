import { querySql, execSql } from "../src/db/connection";
import { runDiscoveryCycle } from "../src/features/campaigns/manager";

async function main() {
  console.log("=== INICIANDO CICLO DE PROSPECÇÃO ORBITA IO ===");
  
  // Limpar jobs falhados antigos causados por falta de chave
  await execSql("DELETE FROM jobs WHERE status = 'failed'");
  console.log("[v] Fila de tarefas limpa de erros anteriores.");

  // Enfileirar ciclo de descoberta para todas as palavras-chave do ICP
  await runDiscoveryCycle();
  console.log("[v] Ciclo de descoberta enfileirado para todas as palavras-chave de clínicas!");

  const pending = await querySql("SELECT type, count(*) as count FROM jobs WHERE status = 'pending' GROUP BY type");
  console.log("[i] Tarefas pendentes para o Robô executar:");
  console.table(pending.rows);

  console.log("\nPronto! O Worker (robô) agora vai processar as buscas e os leads começarão a aparecer no painel em http://localhost:3000/leads");
}

main().catch(console.error);
