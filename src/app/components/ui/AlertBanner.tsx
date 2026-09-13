import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

export default function AlertBanner({ message, variant = 'info' }: { message: string, variant?: 'info'|'warning'|'error'|'success' }) {
  const styles = {
    info: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
    warning: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    error: 'bg-red-500/10 text-red-300 border-red-500/20',
    success: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
  };

  const icons = {
    info: <Info size={18} className="text-sky-400 shrink-0" />,
    warning: <AlertTriangle size={18} className="text-amber-400 shrink-0" />,
    error: <AlertCircle size={18} className="text-red-400 shrink-0" />,
    success: <CheckCircle size={18} className="text-emerald-400 shrink-0" />
  };

  return (
    <div className={`p-3.5 rounded-xl border flex items-center gap-3 backdrop-blur-sm ${styles[variant]}`}>
      {icons[variant]}
      <span className="font-medium text-xs">{message}</span>
    </div>
  );
}
