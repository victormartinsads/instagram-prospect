import { querySql } from '@/db/connection';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { LayoutDashboard, Users, MessageSquare, FlaskConical, DollarSign, Settings } from 'lucide-react';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Mart Digital — Prospecção',
  description: 'Sistema de prospecção do Instagram',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await querySql("SELECT value FROM system_state WHERE key = 'is_paused'");
  const isPaused = result.rows.length > 0 && JSON.parse(result.rows[0].value as string) === true;

  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-gray-50 text-gray-900 flex h-screen overflow-hidden`}>
        <aside className="w-64 bg-white border-r flex flex-col justify-between h-full">
          <div>
            <div className="p-6 font-bold text-xl text-primary-dark border-b">
              Mart Digital
            </div>
            <nav className="p-4 space-y-2">
              <Link href="/" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-primary">
                <LayoutDashboard size={20} /> Dashboard
              </Link>
              <Link href="/leads" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-primary">
                <Users size={20} /> Leads
              </Link>
              <Link href="/conversations" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-primary">
                <MessageSquare size={20} /> Conversas
              </Link>
              <Link href="/experiments" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-primary">
                <FlaskConical size={20} /> Experimentos
              </Link>
              <Link href="/costs" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-primary">
                <DollarSign size={20} /> Custos IA
              </Link>
              <Link href="/settings" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-primary">
                <Settings size={20} /> Configurações
              </Link>
            </nav>
          </div>
          <div className="p-4 border-t text-sm flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-danger' : 'bg-success'}`} />
            <span className="text-gray-600 font-medium">
              Sistema {isPaused ? 'Pausado' : 'Ativo'}
            </span>
          </div>
        </aside>
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
