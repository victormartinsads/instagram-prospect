import React from 'react';

export default function MetricCard({ label, value, icon }: { label: string, value: string | number, icon: React.ReactNode }) {
  return (
    <div className="bg-[#121214] p-5 rounded-xl border border-white/[0.08] hover:border-[#ea580c]/40 transition-all flex items-center gap-4 shadow-sm group">
      <div className="p-3 bg-orange-500/10 text-[#f97316] border border-orange-500/20 rounded-xl group-hover:shadow-[0_0_16px_rgba(234,88,12,0.25)] transition-all">
        {icon}
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-zinc-400 font-medium">{label}</div>
        <div className="text-2xl font-bold text-white tracking-tight mt-0.5">{value}</div>
      </div>
    </div>
  );
}
