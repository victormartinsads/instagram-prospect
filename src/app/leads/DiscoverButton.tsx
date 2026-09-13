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
      className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-white shadow-sm transition ${
        isPending
          ? 'bg-indigo-400 cursor-not-allowed'
          : 'bg-primary hover:bg-primary-dark cursor-pointer'
      }`}
    >
      {isPending ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Iniciando ciclo...</span>
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
