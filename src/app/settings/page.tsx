import { querySql } from '@/db/connection';
import AlertBanner from '../components/ui/AlertBanner';

export default async function SettingsPage() {
  const stateRes = await querySql('SELECT * FROM system_state');
  const states = stateRes.rows.reduce((acc: any, curr: any) => {
    acc[curr.key] = JSON.parse(curr.value as string);
    return acc;
  }, {});

  const auditRes = await querySql("SELECT * FROM audit_log WHERE actor = 'ai' ORDER BY created_at DESC LIMIT 20");
  
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Configurações do Sistema</h1>
        <p className="text-sm text-zinc-400 mt-1">Status de infraestrutura, limites de segurança e auditoria da IA</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#121214] p-6 rounded-xl border border-white/[0.08] space-y-4 shadow-sm">
          <h2 className="text-base font-semibold text-white border-b border-white/[0.08] pb-3">Status das Integrações</h2>
          
          <div className="flex justify-between items-center p-3 bg-[#18181B] rounded-lg border border-white/[0.06]">
            <span className="text-sm font-medium text-zinc-200">Navegador Playwright (CDP)</span>
            <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Conectado
            </span>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-[#18181B] rounded-lg border border-white/[0.06]">
            <span className="text-sm font-medium text-zinc-200">API Instagram (Meta Graph)</span>
            <span className="text-zinc-400 text-xs font-medium bg-zinc-800 px-2.5 py-1 rounded-full border border-white/[0.08]">
              Standby
            </span>
          </div>

          <div className="flex justify-between items-center p-3 bg-[#18181B] rounded-lg border border-white/[0.06]">
            <span className="text-sm font-medium text-zinc-200">Motor de IA (OpenAI / Heurística)</span>
            <span className="text-[#f97316] text-xs font-semibold flex items-center gap-1.5 bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f97316]"></span> Ativo
            </span>
          </div>
        </div>

        <div className="bg-[#121214] p-6 rounded-xl border border-white/[0.08] space-y-4 shadow-sm">
          <h2 className="text-base font-semibold text-white border-b border-white/[0.08] pb-3">Limites Operacionais & Warmup</h2>
          <div className="text-xs text-zinc-300 space-y-3">
            <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
              <span className="text-zinc-400">DMs por dia (Aquecimento):</span> 
              <strong className="text-white font-mono bg-[#18181B] px-2 py-0.5 rounded border border-white/[0.06]">15 / dia</strong>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
              <span className="text-zinc-400">Intervalo randômico entre ações:</span> 
              <strong className="text-white font-mono bg-[#18181B] px-2 py-0.5 rounded border border-white/[0.06]">3 - 7 min</strong>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
              <span className="text-zinc-400">Janela de operação (Seg a Sex):</span> 
              <strong className="text-white font-mono bg-[#18181B] px-2 py-0.5 rounded border border-white/[0.06]">09:00 - 20:00 BRT</strong>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-zinc-400">Pausa de final de semana:</span> 
              <strong className="text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Ativada (Proteção)</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#121214] p-6 rounded-xl border border-white/[0.08] shadow-sm">
        <h2 className="text-base font-semibold text-white mb-4">Gerenciamento de Sistema</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-medium mb-2.5">Circuit Breakers</h3>
            <div className="flex gap-3">
              <button className="px-3.5 py-2 bg-[#18181B] hover:bg-[#27272A] border border-white/[0.08] text-zinc-300 rounded-lg text-xs font-medium cursor-pointer transition-all">
                Resetar Navegador
              </button>
              <button className="px-3.5 py-2 bg-[#18181B] hover:bg-[#27272A] border border-white/[0.08] text-zinc-300 rounded-lg text-xs font-medium cursor-pointer transition-all">
                Resetar IA
              </button>
            </div>
          </div>
          <hr className="border-white/[0.06]" />
          <div>
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-medium mb-2.5">Segurança e Backup</h3>
            <div className="flex items-center gap-4">
              <button className="px-4 py-2 bg-[#ea580c] hover:bg-[#f97316] text-white rounded-lg font-medium text-xs shadow-[0_0_15px_rgba(234,88,12,0.3)] border border-orange-500/30 cursor-pointer transition-all">
                Gerar Backup Agora
              </button>
              <span className="text-xs text-zinc-500 font-mono">Último backup seguro: SQLite WAL snapshot</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#121214] p-6 rounded-xl border border-white/[0.08] shadow-sm">
        <h2 className="text-base font-semibold text-white mb-4">Log de Decisões da IA</h2>
        <div className="max-h-96 overflow-y-auto border border-white/[0.08] rounded-lg">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#18181B] sticky top-0 border-b border-white/[0.08] text-zinc-400">
                <th className="p-3">Data</th>
                <th className="p-3">Ação</th>
                <th className="p-3">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {auditRes.rows.map((log: any) => (
                <tr key={log.id} className="border-b border-white/[0.04] last:border-0 text-zinc-300">
                  <td className="p-3 whitespace-nowrap text-zinc-500 font-mono text-[11px]">{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                  <td className="p-3 font-semibold text-white">{log.action}</td>
                  <td className="p-3 text-zinc-400 truncate max-w-md">{log.details}</td>
                </tr>
              ))}
              {auditRes.rows.length === 0 && (
                <tr><td colSpan={3} className="p-6 text-center text-zinc-500">Nenhum log recente registrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
