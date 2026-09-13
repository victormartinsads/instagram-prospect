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
    <div className="max-w-3xl mx-auto h-[calc(100vh-8rem)] flex flex-col bg-[#121214] rounded-2xl shadow-xl border border-white/[0.08] overflow-hidden">
      <div className="p-4 border-b border-white/[0.08] flex justify-between items-center bg-[#18181B]/90 backdrop-blur-md">
        <div>
          <h2 className="font-bold text-base text-white tracking-tight">@{conversation.instagram_handle}</h2>
          <div className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
            <span>{conversation.name || 'Sem nome registrado'}</span>
            <StatusBadge status={conversation.channel_status} type="channel" />
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 rounded-lg text-xs font-medium cursor-pointer transition-all">
            Escalar
          </button>
          <button className="px-3 py-1.5 bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500/20 rounded-lg text-xs font-medium cursor-pointer transition-all">
            Encerrar
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col space-y-1">
        {messages.length === 0 && (
          <div className="text-center text-zinc-500 text-xs my-auto">Nenhuma mensagem registrada ainda nesta conversa.</div>
        )}
        {messages.map((msg: any) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>

      <div className="p-4 border-t border-white/[0.08] bg-[#18181B]/90 backdrop-blur-md">
        <form className="flex gap-2.5">
          <input 
            type="text" 
            placeholder="Digite sua resposta manual..." 
            className="flex-1 px-4 py-2.5 bg-[#121214] border border-white/[0.1] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ea580c] focus:ring-1 focus:ring-[#ea580c] transition-all"
          />
          <button 
            type="submit" 
            className="px-5 py-2.5 bg-[#ea580c] hover:bg-[#f97316] text-white rounded-xl text-xs font-semibold shadow-[0_0_15px_rgba(234,88,12,0.35)] border border-orange-500/30 cursor-pointer transition-all active:scale-95"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
