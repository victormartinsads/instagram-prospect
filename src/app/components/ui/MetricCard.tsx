import React from 'react';

export default function MetricCard({ label, value, icon }: { label: string, value: string | number, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
      <div className="p-3 bg-primary-light/10 text-primary rounded-lg">
        {icon}
      </div>
      <div>
        <div className="text-sm text-gray-500 font-medium">{label}</div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
      </div>
    </div>
  );
}
