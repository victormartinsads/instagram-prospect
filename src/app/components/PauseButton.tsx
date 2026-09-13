'use client';
import { useState } from 'react';

export default function PauseButton({ initialPaused }: { initialPaused: boolean }) {
  const [isPaused, setIsPaused] = useState(initialPaused);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (confirm(isPaused ? "Deseja retomar o sistema?" : "Deseja pausar o sistema?")) {
      setLoading(true);
      setIsPaused(!isPaused);
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleToggle}
      disabled={loading}
      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-sm ${
        isPaused 
          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-400/30' 
          : 'bg-[#18181B] hover:bg-red-950/40 text-red-400 border border-red-500/30 hover:border-red-500/60'
      } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {loading ? 'Processando...' : isPaused ? 'Retomar Sistema' : 'Pausar Sistema'}
    </button>
  );
}
