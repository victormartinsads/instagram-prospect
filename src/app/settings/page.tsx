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
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-3xl font-bold text-gray-800">Configurações</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">Status das Integrações</h2>
          
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
            <span className="font-medium">Navegador Playwright</span>
            <span className="text-success text-sm font-bold flex items-center gap-1">Conectado</span>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
            <span className="font-medium">API Instagram (Oficial)</span>
            <span className="text-gray-500 text-sm">Não Configurada</span>
          </div>

          <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
            <span className="font-medium">OpenAI (IA)</span>
            <span className="text-success text-sm font-bold">Ativo</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">Limites Operacionais</h2>
          <div className="text-sm text-gray-600 space-y-2">
            <div className="flex justify-between"><span>DMs por dia (Aquecimento):</span> <strong>20</strong></div>
            <div className="flex justify-between"><span>Intervalo entre ações:</span> <strong>3-7 minutos</strong></div>
            <div className="flex justify-between"><span>Horário de operação:</span> <strong>09:00 - 20:00</strong></div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">Gerenciamento de Sistema</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Circuit Breakers</h3>
            <div className="flex gap-4">
              <button className="px-4 py-2 border rounded hover:bg-gray-50 text-sm">Resetar Navegador</button>
              <button className="px-4 py-2 border rounded hover:bg-gray-50 text-sm">Resetar IA</button>
            </div>
          </div>
          <hr />
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Dados e Backup</h3>
            <div className="flex items-center gap-4">
              <button className="px-4 py-2 bg-primary text-white rounded font-medium text-sm">Gerar Backup Agora</button>
              <span className="text-xs text-gray-500">Último backup: Hoje, 02:00</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">Log de Decisões da IA</h2>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 sticky top-0 border-b">
                <th className="p-3">Data</th>
                <th className="p-3">Ação</th>
                <th className="p-3">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {auditRes.rows.map((log: any) => (
                <tr key={log.id} className="border-b last:border-0">
                  <td className="p-3 whitespace-nowrap text-gray-500">{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                  <td className="p-3 font-medium">{log.action}</td>
                  <td className="p-3 text-gray-600 truncate max-w-md">{log.details}</td>
                </tr>
              ))}
              {auditRes.rows.length === 0 && (
                <tr><td colSpan={3} className="p-4 text-center text-gray-500">Nenhum log recente</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
