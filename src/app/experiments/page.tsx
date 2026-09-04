import { querySql } from '@/db/connection';
import StatusBadge from '../components/ui/StatusBadge';

export default async function ExperimentsPage() {
  const result = await querySql('SELECT * FROM experiments ORDER BY created_at DESC');
  const experiments = result.rows;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Experimentos</h1>
        <button className="px-4 py-2 bg-success text-white rounded-md font-medium">Novo Experimento</button>
      </div>

      <div className="grid gap-6">
        {experiments.length === 0 && (
          <div className="bg-white p-8 rounded-xl shadow-sm border text-center text-gray-500">
            Nenhum experimento configurado.
          </div>
        )}
        {experiments.map(async (exp: any) => {
          const varsRes = await querySql('SELECT * FROM experiment_variants WHERE experiment_id = ?', [exp.id]);
          const variants = varsRes.rows;

          return (
            <div key={exp.id} className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold">{exp.name}</h2>
                  <p className="text-gray-500 text-sm mt-1">Variável: {exp.variable} | Funil: {exp.funnel}</p>
                  <p className="text-gray-600 mt-2 bg-gray-50 p-2 rounded inline-block text-sm">Hipótese: {exp.hypothesis}</p>
                </div>
                <StatusBadge status={exp.status} type="pipeline" />
              </div>

              <div className="mt-4">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-t">
                      <th className="p-3 font-medium">Variante</th>
                      <th className="p-3 font-medium">Atribuídos</th>
                      <th className="p-3 font-medium">Conversões</th>
                      <th className="p-3 font-medium">Taxa (%)</th>
                      <th className="p-3 font-medium">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v: any) => (
                      <tr key={v.id} className={`border-b ${exp.winner_variant_id === v.id ? 'bg-green-50' : ''}`}>
                        <td className="p-3 font-medium">{v.name} {exp.winner_variant_id === v.id && '🏆'}</td>
                        <td className="p-3">{v.assigned_count}</td>
                        <td className="p-3">{v.conversion_count}</td>
                        <td className="p-3">{(v.conversion_rate as number * 100).toFixed(1)}%</td>
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
