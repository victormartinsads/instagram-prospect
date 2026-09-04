import React from 'react';

export default function MessageBubble({ message }: { message: any }) {
  const isInbound = message.direction === 'inbound';

  return (
    <div className={`flex w-full mb-4 ${isInbound ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[70%] p-3 rounded-lg ${isInbound ? 'bg-gray-100 text-gray-800 rounded-bl-none' : 'bg-primary text-white rounded-br-none'}`}>
        <div className="text-sm">{message.content}</div>
        <div className={`text-[10px] mt-1 ${isInbound ? 'text-gray-500' : 'text-primary-light'}`}>
          {new Date(message.sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {message.channel}
        </div>
        {message.intent_classified && (
          <div className="mt-2 text-xs bg-white/20 p-1 rounded">Intenção: {message.intent_classified}</div>
        )}
      </div>
    </div>
  );
}
