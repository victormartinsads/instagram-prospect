import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

export default function AlertBanner({ message, variant = 'info' }: { message: string, variant?: 'info'|'warning'|'error'|'success' }) {
  const styles = {
    info: 'bg-blue-50 text-blue-800 border-blue-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    success: 'bg-green-50 text-green-800 border-green-200'
  };

  const icons = {
    info: <Info size={20} />,
    warning: <AlertTriangle size={20} />,
    error: <AlertCircle size={20} />,
    success: <CheckCircle size={20} />
  };

  return (
    <div className={`p-4 rounded-md border flex items-center gap-3 ${styles[variant]}`}>
      {icons[variant]}
      <span className="font-medium text-sm">{message}</span>
    </div>
  );
}
