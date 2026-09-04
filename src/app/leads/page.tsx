import { querySql } from '@/db/connection';
import { PIPELINE_STATUS_LABELS } from '@/lib/types';
import KanbanColumn from '../components/ui/KanbanColumn';
import StatusBadge from '../components/ui/StatusBadge';
import Link from 'next/link';

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
        <h1 className="text-3xl font-bold text-gray-800">Leads</h1>
        <div className="flex gap-4">
          <Link href="?type=client" className={`px-4 py-2 rounded-md ${type === 'client' ? 'bg-primary text-white' : 'bg-white border'}`}>Clientes</Link>
          <Link href="?type=affiliate" className={`px-4 py-2 rounded-md ${type === 'affiliate' ? 'bg-primary text-white' : 'bg-white border'}`}>Afiliados</Link>
          <button className="px-4 py-2 bg-success text-white rounded-md font-medium">Novo Lead</button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto flex gap-4 pb-4">
        {statuses.map((status) => {
          const colLeads = leads.filter(l => l.pipeline_status === status);
          return (
            <KanbanColumn key={status} label={PIPELINE_STATUS_LABELS[status] || status} count={colLeads.length}>
              {colLeads.map((lead: any) => (
                <Link href={`/leads/${lead.id}`} key={lead.id} className="block bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:border-primary transition cursor-pointer mb-3">
                  <div className="font-medium text-gray-900 truncate">@{lead.instagram_handle}</div>
                  <div className="text-sm text-gray-500 truncate">{lead.name || 'Sem nome'}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      (lead.icp_score as number) < 30 ? 'bg-red-100 text-red-700' :
                      (lead.icp_score as number) < 60 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>Score: {lead.icp_score}</span>
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
