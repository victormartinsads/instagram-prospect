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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Custos de IA</h1>

      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="text-lg font-semibold mb-2">Orçamento Mensal Utilizado</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
            <div 
              className={`h-full ${totalBrl > limitBrl * 0.8 ? 'bg-danger' : 'bg-primary'}`} 
              style={{ width: `${Math.min(100, (totalBrl / limitBrl) * 100)}%` }} 
            />
          </div>
          <div className="font-bold whitespace-nowrap text-gray-700">
            R$ {totalBrl.toFixed(2)} / R$ {limitBrl.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard label="Custo Total (Mês)" value={`R$ ${totalBrl.toFixed(2)}`} icon={<span className="text-xl">$</span>} />
        <MetricCard label="Custo Médio por Lead" value={`R$ ${(totalBrl / newLeads).toFixed(4)}`} icon={<span className="text-xl">÷</span>} />
        <MetricCard label="Total de Tokens" value={totalTokens.toLocaleString('pt-BR')} icon={<span className="text-xl">T</span>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Por Modelo</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">Modelo</th>
                <th className="py-2">Chamadas</th>
                <th className="py-2">Tokens</th>
                <th className="py-2">Custo (USD)</th>
              </tr>
            </thead>
            <tbody>
              {byModelRes.rows.map((row: any) => (
                <tr key={row.model} className="border-b last:border-0">
                  <td className="py-2 font-medium">{row.model}</td>
                  <td className="py-2">{row.calls}</td>
                  <td className="py-2">{row.tokens}</td>
                  <td className="py-2">${(row.cost as number).toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Por Propósito</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">Propósito</th>
                <th className="py-2">Chamadas</th>
                <th className="py-2">Custo (USD)</th>
              </tr>
            </thead>
            <tbody>
              {byPurposeRes.rows.map((row: any) => (
                <tr key={row.purpose} className="border-b last:border-0">
                  <td className="py-2 font-medium">{row.purpose}</td>
                  <td className="py-2">{row.calls}</td>
                  <td className="py-2">${(row.cost as number).toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
