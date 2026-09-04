'use client';
import { useState } from 'react';
import { togglePauseAction } from '@/features/system/actions'; // assumido ou inline no server action

export default function PauseButton({ initialPaused }: { initialPaused: boolean }) {
  const [isPaused, setIsPaused] = useState(initialPaused);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (confirm(isPaused ? "Deseja retomar o sistema?" : "Deseja pausar o sistema?")) {
      setLoading(true);
      // Aqui simularia a chamada
      // await togglePauseAction(!isPaused);
      setIsPaused(!isPaused);
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleToggle}
      disabled={loading}
      className={`px-4 py-2 rounded-md font-medium text-white transition ${
        isPaused ? 'bg-success hover:bg-green-600' : 'bg-danger hover:bg-red-600'
      } ${loading ? 'opacity-50' : ''}`}
    >
      {loading ? 'Processando...' : isPaused ? 'Retomar Sistema' : 'Pausar Sistema'}
    </button>
  );
}
