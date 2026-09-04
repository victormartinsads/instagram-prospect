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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Conversas Ativas</h1>
        <div className="flex gap-4">
          <Link href="?filter=all" className={`px-4 py-2 rounded-md ${!needsAttentionOnly ? 'bg-primary text-white' : 'bg-white border'}`}>Todas</Link>
          <Link href="?filter=attention" className={`px-4 py-2 rounded-md ${needsAttentionOnly ? 'bg-primary text-white' : 'bg-white border'}`}>Atenção Necessária</Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-4 font-medium text-gray-600">Lead</th>
              <th className="p-4 font-medium text-gray-600">Status do Canal</th>
              <th className="p-4 font-medium text-gray-600">Última Mensagem</th>
              <th className="p-4 font-medium text-gray-600">Ação</th>
            </tr>
          </thead>
          <tbody>
            {conversations.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">Nenhuma conversa encontrada</td>
              </tr>
            )}
            {conversations.map((conv: any) => (
              <tr key={conv.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-4">
                  <div className="font-medium text-gray-900">@{conv.instagram_handle}</div>
                  <div className="text-sm text-gray-500">{conv.name}</div>
                </td>
                <td className="p-4">
                  <StatusBadge status={conv.channel_status} type="channel" />
                </td>
                <td className="p-4 text-sm text-gray-500">
                  {conv.last_message_at ? new Date(conv.last_message_at).toLocaleString('pt-BR') : 'Sem mensagens'}
                </td>
                <td className="p-4">
                  <Link href={`/conversations/${conv.id}`} className="text-primary hover:underline text-sm font-medium">
                    Ver Conversa
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
