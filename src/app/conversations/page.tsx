import { querySql } from '@/db/connection';
import Link from 'next/link';
import StatusBadge from '../components/ui/StatusBadge';

export default async function ConversationsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const resolvedParams = await searchParams;
  const needsAttentionOnly = resolvedParams.filter === 'attention';

  let sqlQuery = `
    SELECT c.*, l.instagram_handle, l.name, l.channel_status 
    FROM conversations c
    JOIN leads l ON c.lead_id = l.id
    WHERE c.status = 'active'
  `;
  if (needsAttentionOnly) {
    sqlQuery += ` AND l.channel_status = 'human_review_required'`;
  }
  sqlQuery += ` ORDER BY c.last_message_at DESC`;

  const result = await querySql(sqlQuery);
  const conversations = result.rows;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Conversas Ativas</h1>
          <p className="text-sm text-zinc-400 mt-1">Acompanhe mensagens trocadas e leads que solicitam atenção</p>
        </div>
        <div className="flex bg-[#121214] p-1 rounded-lg border border-white/[0.08]">
          <Link 
            href="?filter=all" 
            className={`px-3 py-1.5 rounded-md font-medium text-xs transition-all ${
              !needsAttentionOnly 
                ? 'bg-[#ea580c] text-white shadow-[0_0_12px_rgba(234,88,12,0.35)]' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Todas
          </Link>
          <Link 
            href="?filter=attention" 
            className={`px-3 py-1.5 rounded-md font-medium text-xs transition-all ${
              needsAttentionOnly 
                ? 'bg-[#ea580c] text-white shadow-[0_0_12px_rgba(234,88,12,0.35)]' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Atenção Necessária
          </Link>
        </div>
      </div>

      <div className="bg-[#121214] rounded-xl border border-white/[0.08] overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#18181B]/80 border-b border-white/[0.08]">
              <th className="p-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Lead</th>
              <th className="p-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Status do Canal</th>
              <th className="p-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Última Mensagem</th>
              <th className="p-4 text-xs font-semibold uppercase tracking-wider text-zinc-400 text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {conversations.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-zinc-500 text-sm">Nenhuma conversa encontrada</td>
              </tr>
            )}
            {conversations.map((conv: any) => (
              <tr key={conv.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="p-4">
                  <div className="font-semibold text-white text-sm">@{conv.instagram_handle}</div>
                  <div className="text-xs text-zinc-400 mt-0.5">{conv.name || 'Sem nome'}</div>
                </td>
                <td className="p-4">
                  <StatusBadge status={conv.channel_status} type="channel" />
                </td>
                <td className="p-4 text-xs font-mono text-zinc-400">
                  {conv.last_message_at ? new Date(conv.last_message_at).toLocaleString('pt-BR') : 'Sem mensagens'}
                </td>
                <td className="p-4 text-right">
                  <Link href={`/conversations/${conv.id}`} className="text-[#f97316] hover:text-[#fb923c] text-xs font-semibold transition-colors">
                    Ver Conversa →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
