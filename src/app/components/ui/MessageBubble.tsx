import React from 'react';

export default function MessageBubble({ message }: { message: any }) {
  const isInbound = message.direction === 'inbound';

  return (
    <div className={`flex w-full mb-3.5 ${isInbound ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[72%] p-3.5 rounded-2xl ${
        isInbound 
          ? 'bg-[#18181B] text-zinc-200 border border-white/[0.08] rounded-bl-xs' 
          : 'bg-gradient-to-r from-[#ea580c] to-[#f97316] text-white shadow-[0_0_18px_rgba(234,88,12,0.25)] rounded-br-xs'
      }`}>
        <div className="text-xs leading-relaxed">{message.content}</div>
        <div className={`text-[10px] mt-1.5 flex items-center justify-end gap-1.5 ${isInbound ? 'text-zinc-500' : 'text-orange-100/70 font-mono'}`}>
          <span>{new Date(message.sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          <span>•</span>
          <span className="uppercase">{message.channel}</span>
        </div>
        {message.intent_classified && (
          <div className="mt-2 text-[10px] bg-black/20 text-white/90 px-2 py-0.5 rounded-full inline-block font-mono">
            Intenção: {message.intent_classified}
          </div>
        )}
      </div>
    </div>
  );
}
