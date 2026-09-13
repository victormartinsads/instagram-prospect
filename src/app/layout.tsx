import { querySql } from '@/db/connection';
import { Inter } from 'next/font/google';
import SidebarNav from './components/SidebarNav';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Orbita IO — Prospecção',
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
    <html lang="pt-BR" className="dark">
      <body className={`${inter.className} bg-[#0A0A0B] text-[#EDEDEE] flex h-screen overflow-hidden antialiased`}>
        {/* Subtle orange mesh grid background */}
        <div 
          className="fixed inset-0 bg-[radial-gradient(#ea580c14_1px,transparent_1px)] [background-size:32px_32px] pointer-events-none -z-10" 
          aria-hidden="true" 
        />
        
        <aside className="w-64 bg-[#121214]/90 backdrop-blur-md border-r border-white/[0.08] flex flex-col justify-between h-full z-10">
          <div>
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
              <div>
                <div className="font-bold text-xl tracking-tight text-white flex items-center gap-0.5">
                  ÓRBITA<span className="text-[#f97316]">.IO</span><span className="text-[#ea580c]">.</span>
                </div>
                <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold mt-0.5">
                  Growth & Automation
                </div>
              </div>
              <span className="flex h-2 w-2 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isPaused ? 'bg-red-400' : 'bg-orange-400'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isPaused ? 'bg-red-500' : 'bg-[#f97316]'}`}></span>
              </span>
            </div>
            <SidebarNav />
          </div>
          <div className="p-4 border-t border-white/[0.08] text-xs flex items-center justify-between bg-[#0e0e10]/60">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
              <span className="text-zinc-400 font-medium">
                {isPaused ? 'Sistema Pausado' : 'Operação Ativa'}
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">v1.2</span>
          </div>
        </aside>
        <main className="flex-1 overflow-auto p-8 relative">
          {children}
        </main>
      </body>
    </html>
  );
}
