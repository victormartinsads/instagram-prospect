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
    querySql("SELECT (SUM(CASE WHEN pipeline_status IN ('replied', 'interested', 'whatsapp_handoff', 'registered', 'active_customer') THEN 1 ELSE 0 END) * 100.0 / NULLIF(SUM(CASE WHEN pipeline_status NOT IN ('discovered', 'qualified') THEN 1 ELSE 0 END), 0)) as rate FROM leads"),
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
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard Geral</h1>
          <p className="text-sm text-zinc-400 mt-1">Visão integrada das operações e conversões em tempo real</p>
        </div>
        <PauseButton initialPaused={isPaused} />
      </div>

      {cost > 1000 && (
        <AlertBanner variant="warning" message="Alerta de Orçamento: Custos de IA excederam 80% do limite mensal." />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <MetricCard label="Total de Leads" value={totalLeads.toString()} icon={<Users size={20} />} />
        <MetricCard label="Leads Qualificados" value={qualifiedLeads.toString()} icon={<CheckCircle size={20} />} />
        <MetricCard label="Conversas Ativas" value={activeConv.toString()} icon={<MessageSquare size={20} />} />
        <MetricCard label="Taxa de Resposta" value={`${replyRate}%`} icon={<Percent size={20} />} />
        <MetricCard label="Encaminhados ao WhatsApp" value={whatsappHandoff.toString()} icon={<ExternalLink size={20} />} />
        <MetricCard label="Custo IA Mensal" value={`R$ ${cost.toFixed(2).replace('.', ',')}`} icon={<DollarSign size={20} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#121214] p-6 rounded-xl border border-white/[0.08]">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-white tracking-tight">Funil de Vendas</h2>
            <span className="text-xs text-zinc-400 font-mono">Conversão</span>
          </div>
          <div className="space-y-3.5">
            {funnelStats.rows.map((row: any) => (
              <div key={row.pipeline_status} className="flex items-center">
                <div className="w-1/3 text-xs uppercase tracking-wider text-zinc-400 truncate">{row.pipeline_status}</div>
                <div className="w-2/3 bg-zinc-800/80 rounded-full h-3 overflow-hidden flex items-center relative">
                  <div 
                    className="bg-gradient-to-r from-[#ea580c] to-[#f97316] h-full rounded-full shadow-[0_0_10px_rgba(234,88,12,0.4)]" 
                    style={{ width: `${Math.max(6, ((row.count as number) / Number(totalLeads || 1)) * 100)}%` }} 
                  />
                  <span className="text-[10px] ml-2 font-mono text-zinc-300 absolute right-2">{row.count as number}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#121214] p-6 rounded-xl border border-white/[0.08]">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-white tracking-tight">Atividade Recente</h2>
            <span className="text-xs text-zinc-400 font-mono">Últimos eventos</span>
          </div>
          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {recentLogRes.rows.length === 0 && (
              <div className="text-xs text-zinc-500 py-4 text-center">Nenhuma atividade registrada ainda</div>
            )}
            {recentLogRes.rows.map((log: any) => (
              <div key={log.id} className="text-xs pb-3 border-b border-white/[0.04] last:border-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-200">{log.action}</span>
                  <span className="text-zinc-500 font-mono text-[10px]">{new Date(log.created_at).toLocaleString('pt-BR')}</span>
                </div>
                <div className="mt-0.5 text-zinc-400 flex items-center gap-1.5">
                  <span className="text-[#f97316] font-medium">{log.actor}</span>
                  <span>em</span>
                  <span className="text-zinc-300 font-mono bg-zinc-800/50 px-1.5 py-0.5 rounded text-[10px]">{log.entity_type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
