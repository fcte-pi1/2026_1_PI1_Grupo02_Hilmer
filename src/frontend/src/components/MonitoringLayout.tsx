import type { ReactNode } from 'react';

type MonitoringLayoutProps = {
  activeView: "telemetria" | "labirinto" | "estados"; 
  onNavigateTelemetria: () => void;
  onNavigateLabirinto: () => void;
  onNavigateEstados: () => void; 
  eyebrow: string;
  title: string;
  description: string;
  statusConexao: "online" | "offline" | "waiting";
  mensagemStatusConexao?: string | null;
  children: ReactNode;
};

export function MonitoringLayout({
  activeView,
  onNavigateTelemetria,
  onNavigateLabirinto,
  onNavigateEstados, 
  eyebrow,
  title,
  description,
  statusConexao,
  mensagemStatusConexao,
  children,
}: MonitoringLayoutProps) {
  const exibindoLabirinto = activeView === "labirinto";
  const exibindoEstados = activeView === "estados"; 

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r border-zinc-200 bg-white lg:flex lg:flex-col">
          
          <div className="flex h-16 items-center gap-3 border-b border-zinc-200 px-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white">🤖</div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-900">Micromouse</h1>
              <p className="text-xs text-zinc-500">Control Center</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-6">
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100">
              <span>▦</span> Visão Geral
            </button>

            <button
              type="button"
              onClick={onNavigateLabirinto}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                exibindoLabirinto ? "bg-zinc-950 text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              <span>⌗</span> Labirinto
            </button>

            <button
              type="button"
              onClick={onNavigateTelemetria}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                activeView === "telemetria" ? "bg-zinc-950 font-medium text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              <span>⌁</span> Telemetria
            </button>

            
            <button
              type="button"
              onClick={onNavigateEstados}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                exibindoEstados ? "bg-zinc-950 font-medium text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              <span>▣</span> Estados
            </button>

            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100">
              <span>↺</span> Histórico
            </button>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100">
              <span>⚙</span> Configuração
            </button>
          </nav>
        </aside>

        
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 lg:px-8">
            <div>
              <p className="text-xs text-zinc-500">Sessão #2026-05-02-014</p>
              <h2 className="text-sm font-medium text-zinc-900">Painel de Monitoramento — Robô MM-07</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700">
                <span className={`h-2 w-2 rounded-full ${
                  statusConexao === 'online' ? 'bg-green-500' : 
                  statusConexao === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
                }`} /> 
                {statusConexao === 'online' ? 'Online' : 
                 statusConexao === 'offline' ? 'Offline' : 'Aguardando'}
              </div>
              {mensagemStatusConexao && (
                <span className="text-xs text-zinc-500 hidden md:block">
                  {mensagemStatusConexao}
                </span>
              )}
            </div>
          </header>

          <main className="flex-1 px-4 py-8 lg:px-10">
            <section className="mx-auto w-full max-w-6xl">
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{eyebrow}</p>
                <h1 className="mt-1 text-2xl font-semibold text-zinc-950">{title}</h1>
                <p className="mt-2 max-w-2xl text-sm text-zinc-500">{description}</p>
              </div>
              {children}
            </section>
          </main>
        </div>

      </div>
    </div>
  );
}