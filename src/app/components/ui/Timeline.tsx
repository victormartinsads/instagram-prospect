import React from 'react';

export default function Timeline({ events }: { events: any[] }) {
  return (
    <div className="relative border-l border-gray-200 ml-3 space-y-4">
      {events.map((event, idx) => (
        <div key={idx} className="pl-6 relative">
          <div className="absolute w-3 h-3 bg-gray-300 rounded-full -left-[6.5px] top-1.5 border-2 border-white"></div>
          <div className="text-xs text-gray-400 mb-1">{new Date(event.date).toLocaleString('pt-BR')}</div>
          {event.type === 'log' ? (
            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
              <span className="font-medium">{event.data.actor}</span>: {event.data.action}
            </div>
          ) : (
            <div className="text-sm bg-blue-50 text-blue-800 p-2 rounded">
              Mensagem {event.data.direction === 'inbound' ? 'Recebida' : 'Enviada'}: {event.data.content}
            </div>
          )}
        </div>
      ))}
      {events.length === 0 && <div className="pl-6 text-sm text-gray-500">Nenhum evento registrado</div>}
    </div>
  );
}
