import { querySql } from '@/db/connection';
import StatusBadge from '../components/ui/StatusBadge';

export default async function ExperimentsPage() {
  const result = await querySql('SELECT * FROM experiments ORDER BY created_at DESC');
  const experiments = result.rows;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Experimentos A/B</h1>
          <p className="text-sm text-zinc-400 mt-1">Testes contínuos de copy, ganchos de abordagem e conversão</p>
        </div>
        <button className="px-4 py-2 bg-[#ea580c] hover:bg-[#f97316] text-white rounded-lg font-medium text-sm shadow-[0_0_15px_rgba(234,88,12,0.3)] border border-orange-500/30 cursor-pointer transition-all">
          Novo Experimento
        </button>
      </div>

      <div className="grid gap-6">
        {experiments.length === 0 && (
          <div className="bg-[#121214] p-8 rounded-xl border border-white/[0.08] text-center text-zinc-500 text-sm">
            Nenhum experimento configurado no momento.
          </div>
        )}
        {experiments.map(async (exp: any) => {
          const varsRes = await querySql('SELECT * FROM experiment_variants WHERE experiment_id = ?', [exp.id]);
          const variants = varsRes.rows;

          return (
            <div key={exp.id} className="bg-[#121214] p-6 rounded-xl border border-white/[0.08] shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">{exp.name}</h2>
                  <p className="text-zinc-400 text-xs mt-1">Variável: <span className="text-zinc-200 font-mono">{exp.variable}</span> | Funil: <span className="text-zinc-200 font-mono">{exp.funnel}</span></p>
                  <p className="text-zinc-300 mt-2 bg-[#18181B] p-2.5 rounded-lg border border-white/[0.06] text-xs leading-relaxed">Hipótese: {exp.hypothesis}</p>
                </div>
                <StatusBadge status={exp.status} type="pipeline" />
              </div>

              <div className="mt-4 overflow-hidden rounded-lg border border-white/[0.08]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#18181B] border-b border-white/[0.08] text-zinc-400">
                      <th className="p-3 font-medium">Variante</th>
                      <th className="p-3 font-medium">Atribuídos</th>
                      <th className="p-3 font-medium">Conversões</th>
                      <th className="p-3 font-medium">Taxa (%)</th>
                      <th className="p-3 font-medium">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v: any) => (
                      <tr key={v.id} className={`border-b border-white/[0.04] last:border-0 ${exp.winner_variant_id === v.id ? 'bg-emerald-500/10 text-emerald-300' : 'text-zinc-300'}`}>
                        <td className="p-3 font-medium text-white flex items-center gap-1.5">
                          {v.name} {exp.winner_variant_id === v.id && '🏆 Vencedor'}
                        </td>
                        <td className="p-3 font-mono">{v.assigned_count}</td>
                        <td className="p-3 font-mono">{v.conversion_count}</td>
                        <td className="p-3 font-mono font-semibold text-[#f97316]">{(v.conversion_rate as number * 100).toFixed(1)}%</td>
                        <td className="p-3">{v.is_control ? 'Controle' : 'Teste'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
