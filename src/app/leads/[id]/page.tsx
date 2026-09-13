import { querySql } from '@/db/connection';
import StatusBadge from '../../components/ui/StatusBadge';
import Timeline from '../../components/ui/Timeline';

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const result = await querySql('SELECT * FROM leads WHERE id = ?', [id]);
  const lead = result.rows[0] as any;

  if (!lead) return <div className="text-zinc-400 p-8 text-center">Lead não encontrado</div>;

  const logsRes = await querySql('SELECT * FROM audit_log WHERE entity_id = ? ORDER BY created_at DESC', [lead.id]);
  const messagesRes = await querySql('SELECT * FROM messages WHERE lead_id = ? ORDER BY sent_at DESC', [lead.id]);

  const timelineEvents = [
    ...logsRes.rows.map((l: any) => ({ type: 'log', date: l.created_at, data: l })),
    ...messagesRes.rows.map((m: any) => ({ type: 'message', date: m.sent_at, data: m }))
  ].sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime());

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-[#121214] p-6 rounded-xl border border-white/[0.08]">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">@{lead.instagram_handle}</h1>
            <p className="text-zinc-400 text-base mt-1">{lead.name || 'Sem nome registrado'}</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-[#ea580c] hover:bg-[#f97316] text-white rounded-lg font-medium text-sm shadow-[0_0_15px_rgba(234,88,12,0.3)] border border-orange-500/30 cursor-pointer transition-all">
              Abordar
            </button>
            <button className="px-4 py-2 bg-[#18181B] hover:bg-red-950/30 text-zinc-300 hover:text-red-400 border border-white/[0.08] hover:border-red-500/30 rounded-lg font-medium text-sm cursor-pointer transition-all">
              Não Contatar
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[#18181B] rounded-xl border border-white/[0.06]">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">Status do Funil</div>
            <div className="mt-1">
              <StatusBadge status={lead.pipeline_status} type="pipeline" />
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">Canal Atual</div>
            <div className="mt-1">
              <StatusBadge status={lead.channel_status} type="channel" />
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">Score ICP</div>
            <div className="font-semibold text-white mt-1 text-base">{lead.icp_score} <span className="text-xs text-zinc-500 font-normal">/ 100</span></div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">Seguidores</div>
            <div className="font-semibold text-white mt-1 text-base">{lead.follower_count ? Number(lead.follower_count).toLocaleString('pt-BR') : '-'}</div>
          </div>
        </div>

        <div className="mt-5">
          <div className="text-xs uppercase tracking-wider text-zinc-400 font-medium mb-1.5">Biografia</div>
          <p className="text-sm bg-[#18181B] text-zinc-300 p-3.5 rounded-lg border border-white/[0.06] whitespace-pre-wrap">
            {lead.bio || 'Sem biografia disponível.'}
          </p>
        </div>
      </div>

      <div className="bg-[#121214] p-6 rounded-xl border border-white/[0.08]">
        <h2 className="text-lg font-semibold text-white tracking-tight mb-4">Linha do Tempo</h2>
        <Timeline events={timelineEvents} />
      </div>
    </div>
  );
}
