import { querySql } from '@/db/connection';
import { PIPELINE_STATUS_LABELS } from '@/lib/types';
import KanbanColumn from '../components/ui/KanbanColumn';
import StatusBadge from '../components/ui/StatusBadge';
import Link from 'next/link';

import DiscoverButton from './DiscoverButton';

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const resolvedParams = await searchParams;
  const type = resolvedParams.type || 'client';
  
  const result = await querySql('SELECT * FROM leads WHERE lead_type = ?', [type]);
  const leads = result.rows;

  const statuses = type === 'client' 
    ? ["discovered", "qualified", "contacted", "replied", "interested", "whatsapp_handoff", "registered", "active_customer", "closed"]
    : ["discovered", "qualified", "contacted", "replied", "interested", "joined_affiliate_group", "active_affiliate", "generated_customer", "closed"];

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Leads no Funil</h1>
          <p className="text-sm text-zinc-400 mt-1">Gerencie os perfis mapeados, qualificados e abordados no Instagram</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#121214] p-1 rounded-lg border border-white/[0.08]">
            <Link 
              href="?type=client" 
              className={`px-3 py-1.5 rounded-md font-medium text-xs transition-all ${
                type === 'client' 
                  ? 'bg-[#ea580c] text-white shadow-[0_0_12px_rgba(234,88,12,0.35)]' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Clientes
            </Link>
            <Link 
              href="?type=affiliate" 
              className={`px-3 py-1.5 rounded-md font-medium text-xs transition-all ${
                type === 'affiliate' 
                  ? 'bg-[#ea580c] text-white shadow-[0_0_12px_rgba(234,88,12,0.35)]' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Afiliados
            </Link>
          </div>
          <DiscoverButton />
        </div>
      </div>

      <div className="flex-1 overflow-x-auto flex gap-4 pb-4">
        {statuses.map((status) => {
          const colLeads = leads.filter(l => l.pipeline_status === status);
          return (
            <KanbanColumn key={status} label={PIPELINE_STATUS_LABELS[status] || status} count={colLeads.length}>
              {colLeads.map((lead: any) => (
                <Link 
                  href={`/leads/${lead.id}`} 
                  key={lead.id} 
                  className="block bg-[#18181B] p-4 rounded-xl border border-white/[0.08] hover:border-[#ea580c]/50 hover:shadow-[0_0_20px_rgba(234,88,12,0.12)] transition-all cursor-pointer mb-3 group"
                >
                  <div className="font-semibold text-white group-hover:text-[#f97316] transition-colors truncate text-sm">
                    @{lead.instagram_handle}
                  </div>
                  <div className="text-xs text-zinc-400 truncate mt-0.5">
                    {lead.name || 'Sem nome registrado'}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${
                      (lead.icp_score as number) < 30 ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      (lead.icp_score as number) < 60 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      Score: {lead.icp_score}
                    </span>
                    <StatusBadge status={lead.channel_status as string} type="channel" />
                  </div>
                </Link>
              ))}
            </KanbanColumn>
          );
        })}
      </div>
    </div>
  );
}
