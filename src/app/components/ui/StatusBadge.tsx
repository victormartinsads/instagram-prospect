'use client';

export default function StatusBadge({ status, type }: { status: string, type: 'pipeline' | 'channel' }) {
  const isPositive = status.includes('active') || status.includes('qualified') || status === 'completed';
  const isPending = status.includes('pending') || status.includes('waiting') || status === 'contacted';
  const isNegative = status === 'do_not_contact' || status === 'blocked' || status === 'closed';

  const color = isPositive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                isPending ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                isNegative ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                'bg-zinc-800/70 text-zinc-400 border-white/[0.08]';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${color}`}>
      {status}
    </span>
  );
}
