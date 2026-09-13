import { querySql } from '@/db/connection';
import MetricCard from '../components/ui/MetricCard';

export default async function CostsPage() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  const totalCostRes = await querySql(`SELECT SUM(estimated_cost_usd) as total, SUM(total_tokens) as tokens FROM ai_calls WHERE strftime('%Y-%m', created_at) = ?`, [currentMonth]);
  const byModelRes = await querySql(`SELECT model, count(*) as calls, SUM(total_tokens) as tokens, SUM(estimated_cost_usd) as cost FROM ai_calls WHERE strftime('%Y-%m', created_at) = ? GROUP BY model`, [currentMonth]);
  const byPurposeRes = await querySql(`SELECT purpose, count(*) as calls, SUM(estimated_cost_usd) as cost FROM ai_calls WHERE strftime('%Y-%m', created_at) = ? GROUP BY purpose`, [currentMonth]);
  const leadsRes = await querySql(`SELECT count(*) as count FROM leads WHERE created_at >= ?`, [`${currentMonth}-01`]);

  const totalUsd = (totalCostRes.rows[0]?.total as number) || 0;
  const totalTokens = (totalCostRes.rows[0]?.tokens as number) || 0;
  const newLeads = (leadsRes.rows[0]?.count as number) || 1; // prevent div by zero
  const totalBrl = totalUsd * 5.0; // simulação de câmbio
  const limitBrl = 100; // orcamento exemplo

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Custos Operacionais & IA</h1>
        <p className="text-sm text-zinc-400 mt-1">Monitoramento de consumo de tokens e custos estimados por modelo</p>
      </div>

      <div className="bg-[#121214] p-6 rounded-xl border border-white/[0.08] shadow-sm">
        <div className="flex justify-between items-center mb-2.5">
          <h2 className="text-sm font-semibold text-white tracking-tight">Orçamento Mensal Estimado</h2>
          <span className="text-xs font-mono text-zinc-400">
            R$ {totalBrl.toFixed(2)} <span className="text-zinc-600">/</span> R$ {limitBrl.toFixed(2)}
          </span>
        </div>
        <div className="bg-zinc-800/80 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              totalBrl > limitBrl * 0.8 
                ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]' 
                : 'bg-gradient-to-r from-[#ea580c] to-[#f97316] shadow-[0_0_12px_rgba(234,88,12,0.4)]'
            }`} 
            style={{ width: `${Math.min(100, (totalBrl / limitBrl) * 100)}%` }} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <MetricCard label="Custo Total (Mês)" value={`R$ ${totalBrl.toFixed(2)}`} icon={<span className="text-base font-bold font-mono">R$</span>} />
        <MetricCard label="Custo Médio por Lead" value={`R$ ${(totalBrl / newLeads).toFixed(4)}`} icon={<span className="text-base font-bold font-mono">÷</span>} />
        <MetricCard label="Total de Tokens" value={totalTokens.toLocaleString('pt-BR')} icon={<span className="text-base font-bold font-mono">TOK</span>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#121214] p-6 rounded-xl border border-white/[0.08] shadow-sm">
          <h2 className="text-base font-semibold text-white tracking-tight mb-4">Consumo por Modelo</h2>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] text-zinc-400">
                <th className="py-2.5 font-medium">Modelo</th>
                <th className="py-2.5 font-medium font-mono">Chamadas</th>
                <th className="py-2.5 font-medium font-mono">Tokens</th>
                <th className="py-2.5 font-medium font-mono text-right">Custo (USD)</th>
              </tr>
            </thead>
            <tbody>
              {byModelRes.rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-zinc-500">Nenhum registro no mês atual</td>
                </tr>
              )}
              {byModelRes.rows.map((row: any) => (
                <tr key={row.model} className="border-b border-white/[0.04] last:border-0 text-zinc-300">
                  <td className="py-2.5 font-medium text-white">{row.model}</td>
                  <td className="py-2.5 font-mono">{row.calls}</td>
                  <td className="py-2.5 font-mono">{row.tokens}</td>
                  <td className="py-2.5 font-mono text-right text-[#f97316] font-semibold">${(row.cost as number).toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-[#121214] p-6 rounded-xl border border-white/[0.08] shadow-sm">
          <h2 className="text-base font-semibold text-white tracking-tight mb-4">Consumo por Propósito</h2>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] text-zinc-400">
                <th className="py-2.5 font-medium">Propósito</th>
                <th className="py-2.5 font-medium font-mono">Chamadas</th>
                <th className="py-2.5 font-medium font-mono text-right">Custo (USD)</th>
              </tr>
            </thead>
            <tbody>
              {byPurposeRes.rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-zinc-500">Nenhum registro no mês atual</td>
                </tr>
              )}
              {byPurposeRes.rows.map((row: any) => (
                <tr key={row.purpose} className="border-b border-white/[0.04] last:border-0 text-zinc-300">
                  <td className="py-2.5 font-medium text-white">{row.purpose}</td>
                  <td className="py-2.5 font-mono">{row.calls}</td>
                  <td className="py-2.5 font-mono text-right text-[#f97316] font-semibold">${(row.cost as number).toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
