import { querySql } from '@/db/connection';
import MetricCard from './components/ui/MetricCard';
import PauseButton from './components/PauseButton';
import { Users, CheckCircle, MessageSquare, Percent, ExternalLink, DollarSign } from 'lucide-react';
import AlertBanner from './components/ui/AlertBanner';

export default async function DashboardPage() {
  const [
    totalLeadsRes,
    qualifiedLeadsRes,
    activeConvRes,
    replyRateRes,
    whatsappRes,
    costRes,
    alertsRes,
    recentLogRes
  ] = await Promise.all([
    querySql('SELECT COUNT(*) as count FROM leads'),
    querySql('SELECT COUNT(*) as count FROM leads WHERE icp_score >= 60'),
    querySql("SELECT COUNT(*) as count FROM conversations WHERE status = 'active'"),
    querySql("SELECT (SUM(CASE WHEN pipeline_status = 'replied' THEN 1 ELSE 0 END) * 100.0 / NULLIF(SUM(CASE WHEN pipeline_status = 'contacted' OR pipeline_status = 'replied' THEN 1 ELSE 0 END), 0)) as rate FROM leads"),
    querySql("SELECT COUNT(*) as count FROM leads WHERE pipeline_status = 'whatsapp_handoff'"),
    querySql("SELECT SUM(estimated_cost_usd) as total FROM ai_calls WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')"),
    querySql("SELECT value FROM system_state WHERE key = 'is_paused'"),
    querySql('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 10')
  ]);

  const totalLeads = totalLeadsRes.rows[0]?.count || 0;
  const qualifiedLeads = qualifiedLeadsRes.rows[0]?.count || 0;
  const activeConv = activeConvRes.rows[0]?.count || 0;
  const replyRate = (replyRateRes.rows[0]?.rate as number || 0).toFixed(1);
  const whatsappHandoff = whatsappRes.rows[0]?.count || 0;
  const cost = (costRes.rows[0]?.total as number || 0) * 5.0; // dummy BRL conversion
  const isPaused = alertsRes.rows.length > 0 && JSON.parse(alertsRes.rows[0].value as string) === true;

  const funnelStats = await querySql(`
    SELECT pipeline_status, COUNT(*) as count
    FROM leads
    GROUP BY pipeline_status
  `);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <PauseButton initialPaused={isPaused} />
      </div>

      {cost > 1000 && (
        <AlertBanner variant="warning" message="Alerta de Orçamento: Custos de IA excederam 80% do limite mensal." />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard label="Total de Leads" value={totalLeads.toString()} icon={<Users />} />
        <MetricCard label="Leads Qualificados" value={qualifiedLeads.toString()} icon={<CheckCircle />} />
        <MetricCard label="Conversas Ativas" value={activeConv.toString()} icon={<MessageSquare />} />
        <MetricCard label="Taxa de Resposta" value={`${replyRate}%`} icon={<Percent />} />
        <MetricCard label="Encaminhados ao WhatsApp" value={whatsappHandoff.toString()} icon={<ExternalLink />} />
        <MetricCard label="Custo IA Mensal" value={`R$ ${cost.toFixed(2).replace('.', ',')}`} icon={<DollarSign />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Funil de Vendas</h2>
          <div className="space-y-3">
            {funnelStats.rows.map((row: any) => (
              <div key={row.pipeline_status} className="flex items-center">
                <div className="w-1/3 text-sm text-gray-600 truncate">{row.pipeline_status}</div>
                <div className="w-2/3 bg-gray-100 rounded-full h-4 overflow-hidden flex items-center">
                  <div className="bg-primary h-full" style={{ width: `${Math.max(5, ((row.count as number) / Number(totalLeads)) * 100)}%` }} />
                  <span className="text-xs ml-2 font-medium text-gray-700">{row.count as number}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Atividade Recente</h2>
          <div className="space-y-4">
            {recentLogRes.rows.map((log: any) => (
              <div key={log.id} className="text-sm">
                <span className="text-gray-500">{new Date(log.created_at).toLocaleString('pt-BR')}</span> -{' '}
                <span className="font-medium">{log.actor}</span>: {log.action} em {log.entity_type}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
