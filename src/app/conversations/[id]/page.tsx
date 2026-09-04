import { querySql } from '@/db/connection';
import MessageBubble from '../../components/ui/MessageBubble';
import StatusBadge from '../../components/ui/StatusBadge';

export default async function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  
  const convRes = await querySql(`
    SELECT c.*, l.instagram_handle, l.name, l.channel_status 
    FROM conversations c
    JOIN leads l ON c.lead_id = l.id
    WHERE c.id = ?
  `, [id]);
  
  const conversation = convRes.rows[0] as any;
  if (!conversation) return <div>Conversa não encontrada</div>;

  const msgRes = await querySql('SELECT * FROM messages WHERE conversation_id = ? ORDER BY sent_at ASC', [id]);
  const messages = msgRes.rows;

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-8rem)] flex flex-col bg-white rounded-xl shadow-sm border">
      <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
        <div>
          <h2 className="font-bold text-lg">@{conversation.instagram_handle}</h2>
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <span>{conversation.name}</span>
            <StatusBadge status={conversation.channel_status} type="channel" />
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded text-sm font-medium">Escalar</button>
          <button className="px-3 py-1.5 border border-red-200 text-red-600 rounded text-sm font-medium hover:bg-red-50">Encerrar</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
        {messages.length === 0 && <div className="text-center text-gray-500 mt-10">Nenhuma mensagem ainda</div>}
        {messages.map((msg: any) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>

      <div className="p-4 border-t bg-gray-50 rounded-b-xl">
        {/* Usar form action server-side real na implementação completa */}
        <form className="flex gap-2">
          <input 
            type="text" 
            placeholder="Digite sua mensagem manualmente..." 
            className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button type="submit" className="px-6 py-2 bg-primary text-white rounded-md font-medium">Enviar</button>
        </form>
      </div>
    </div>
  );
}
