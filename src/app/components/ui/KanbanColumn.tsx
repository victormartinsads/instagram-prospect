import React from 'react';

export default function KanbanColumn({ label, count, children }: { label: string, count: number, children: React.ReactNode }) {
  return (
    <div className="bg-[#121214]/70 backdrop-blur-sm flex-none w-80 rounded-xl p-4 border border-white/[0.08] flex flex-col">
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/[0.04]">
        <h3 className="font-semibold text-zinc-200 text-sm tracking-wide">{label}</h3>
        <span className="bg-[#18181B] text-zinc-400 border border-white/[0.08] text-xs font-mono py-0.5 px-2 rounded-full font-medium">
          {count}
        </span>
      </div>
      <div className="flex flex-col min-h-[500px]">
        {children}
      </div>
    </div>
  );
}
