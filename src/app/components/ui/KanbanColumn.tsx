import React from 'react';

export default function KanbanColumn({ label, count, children }: { label: string, count: number, children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 flex-none w-80 rounded-xl p-4 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-700">{label}</h3>
        <span className="bg-gray-200 text-gray-700 text-xs py-1 px-2 rounded-full">{count}</span>
      </div>
      <div className="flex flex-col min-h-[500px]">
        {children}
      </div>
    </div>
  );
}
