'use client';

import { useTransition } from 'react';
import { Compass, RefreshCw } from 'lucide-react';
import { triggerDiscoveryAction } from './actions';

export default function DiscoverButton() {
  const [isPending, startTransition] = useTransition();

  const handleStartDiscovery = () => {
    startTransition(async () => {
      await triggerDiscoveryAction();
    });
  };

  return (
    <button
      onClick={handleStartDiscovery}
      disabled={isPending}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm text-white shadow-sm transition-all ${
        isPending
          ? 'bg-zinc-800 text-zinc-500 border border-white/[0.08] cursor-not-allowed'
          : 'bg-[#ea580c] hover:bg-[#f97316] text-white shadow-[0_0_20px_rgba(234,88,12,0.35)] border border-orange-500/30 cursor-pointer active:scale-95'
      }`}
    >
      {isPending ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin text-orange-400" />
          <span>Buscando leads...</span>
        </>
      ) : (
        <>
          <Compass className="w-4 h-4" />
          <span>Buscar Novos Leads</span>
        </>
      )}
    </button>
  );
}
