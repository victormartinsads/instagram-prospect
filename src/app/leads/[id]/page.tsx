import { querySql } from '@/db/connection';
import StatusBadge from '../../components/ui/StatusBadge';
import Timeline from '../../components/ui/Timeline';

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const result = await querySql('SELECT * FROM leads WHERE id = ?', [id]);
  const lead = result.rows[0] as any;

  if (!lead) return <div>Lead não encontrado</div>;

  const logsRes = await querySql('SELECT * FROM audit_log WHERE entity_id = ? ORDER BY created_at DESC', [lead.id]);
  const messagesRes = await querySql('SELECT * FROM messages WHERE lead_id = ? ORDER BY sent_at DESC', [lead.id]);

  const timelineEvents = [
    ...logsRes.rows.map((l: any) => ({ type: 'log', date: l.created_at, data: l })),
    ...messagesRes.rows.map((m: any) => ({ type: 'message', date: m.sent_at, data: m }))
  ].sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime());

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">@{lead.instagram_handle}</h1>
            <p className="text-gray-500 text-lg mt-1">{lead.name}</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-primary text-white rounded-md font-medium text-sm">Abordar</button>
            <button className="px-4 py-2 border border-gray-300 rounded-md font-medium text-sm hover:bg-gray-50">Não Contatar</button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-500">Status</div>
            <StatusBadge status={lead.pipeline_status} type="pipeline" />
          </div>
          <div>
            <div className="text-sm text-gray-500">Canal</div>
            <StatusBadge status={lead.channel_status} type="channel" />
          </div>
          <div>
            <div className="text-sm text-gray-500">Score ICP</div>
            <div className="font-medium">{lead.icp_score} / 100</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Seguidores</div>
            <div className="font-medium">{lead.follower_count}</div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-sm text-gray-500">Bio</div>
          <p className="mt-1 text-sm bg-gray-50 p-3 rounded-md">{lead.bio || 'Sem biografia'}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">Linha do Tempo</h2>
        <Timeline events={timelineEvents} />
      </div>
    </div>
  );
}
