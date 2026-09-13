import React from 'react';

export default function Timeline({ events }: { events: any[] }) {
  return (
    <div className="relative border-l border-white/[0.08] ml-3 space-y-4">
      {events.map((event, idx) => (
        <div key={idx} className="pl-6 relative">
          <div className="absolute w-2.5 h-2.5 bg-[#ea580c] rounded-full -left-[5.5px] top-1.5 shadow-[0_0_8px_rgba(234,88,12,0.6)]"></div>
          <div className="text-[11px] font-mono text-zinc-500 mb-1">{new Date(event.date).toLocaleString('pt-BR')}</div>
          {event.type === 'log' ? (
            <div className="text-xs text-zinc-300 bg-[#18181B] p-2.5 rounded-lg border border-white/[0.06]">
              <span className="font-semibold text-[#f97316]">{event.data.actor}</span>: {event.data.action}
            </div>
          ) : (
            <div className="text-xs bg-orange-500/10 text-orange-200 p-2.5 rounded-lg border border-orange-500/20">
              <span className="font-medium text-[#fb923c]">Mensagem {event.data.direction === 'inbound' ? 'Recebida' : 'Enviada'}:</span> {event.data.content}
            </div>
          )}
        </div>
      ))}
      {events.length === 0 && <div className="pl-6 text-xs text-zinc-500">Nenhum evento registrado</div>}
    </div>
  );
}
