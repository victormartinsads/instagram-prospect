'use client';

export default function StatusBadge({ status, type }: { status: string, type: 'pipeline' | 'channel' }) {
  // Simplificado para economizar espaço
  const isPositive = status.includes('active') || status.includes('qualified') || status === 'completed';
  const isPending = status.includes('pending') || status.includes('waiting');
  const isNegative = status === 'do_not_contact' || status === 'blocked' || status === 'closed';

  const color = isPositive ? 'bg-green-100 text-green-800' :
                isPending ? 'bg-yellow-100 text-yellow-800' :
                isNegative ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}
