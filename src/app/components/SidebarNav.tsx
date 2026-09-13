'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  FlaskConical, 
  DollarSign, 
  Settings 
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/conversations', label: 'Conversas', icon: MessageSquare },
  { href: '/experiments', label: 'Experimentos', icon: FlaskConical },
  { href: '/costs', label: 'Custos IA', icon: DollarSign },
  { href: '/settings', label: 'Configurações', icon: Settings },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="p-3 space-y-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = item.href === '/' 
          ? pathname === '/' 
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              isActive
                ? 'bg-[#18181B] text-white border border-[#ea580c]/30 shadow-[0_0_15px_rgba(234,88,12,0.15)]'
                : 'text-zinc-400 hover:text-white hover:bg-[#18181B]/60 border border-transparent hover:border-white/[0.05]'
            }`}
          >
            <Icon 
              size={18} 
              className={isActive ? 'text-[#f97316]' : 'text-zinc-400 group-hover:text-zinc-200'} 
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
