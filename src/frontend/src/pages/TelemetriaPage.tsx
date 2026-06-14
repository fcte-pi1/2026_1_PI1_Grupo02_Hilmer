import MazeViewer from "../components/maze/MazeViewer";
import { TopIndicators, ControlPanel, TelemetryAlerts } from "../components/DashboardIndicadores";
import { MonitoringLayout } from "../components/MonitoringLayout";
import { useTelemetria } from "../hooks/useTelemetria";
import { ChevronRight, History } from "lucide-react";

type TelemetriaPageProps = {
  activeView: "telemetria" | "corridas";
  onNavigateTelemetria: () => void;
  onNavigateCorridas: () => void;
};

export function TelemetriaPage({
  activeView,
  onNavigateTelemetria,
  onNavigateCorridas,
}: TelemetriaPageProps) {
  const telemetria = useTelemetria();

  return (
    <MonitoringLayout
      activeView={activeView}
      onNavigateTelemetria={onNavigateTelemetria}
      onNavigateCorridas={onNavigateCorridas}
      eyebrow="Monitoramento"
      title="Mapa em Tempo Real"
      description="Visualize a exploração do labirinto, paredes detectadas e o rastro de movimentação do robô."
      statusConexao={telemetria.statusConexao}
      mensagemStatusConexao={telemetria.mensagemStatusConexao}
    >
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full animate-in fade-in duration-500">
        {/* Top compact indicators */}
        <TopIndicators telemetria={telemetria} />

        {/* Alerts if any */}
        <TelemetryAlerts telemetria={telemetria} />

        {/* Main Layout: Sidebar + Content */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar: Controls + Logs */}
          <aside className="w-full lg:w-64 xl:w-72 flex flex-col gap-6 flex-shrink-0">
            <ControlPanel telemetria={telemetria} />

            {/* Trajectory Logs Section */}
            <section className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-5 shadow-sm">
               <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500 mb-4 flex items-center gap-2">
                  <History size={14} className="text-purple-400" />
                  Logs de Trajeto
               </h3>
               
               <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {telemetria.filaMovimentacoes.length === 0 ? (
                    <div className="py-8 text-center text-zinc-600 italic text-xs border border-dashed border-zinc-800 rounded-xl">
                      Aguardando início...
                    </div>
                  ) : (
                    telemetria.filaMovimentacoes.slice(-10).reverse().map((mov, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/50 text-[11px] group hover:border-zinc-700 transition">
                        <div className="flex items-center gap-2">
                          <ChevronRight size={12} className="text-zinc-600 group-hover:text-yellow-400 transition" />
                          <span className="font-bold text-zinc-400">Movimentou</span>
                        </div>
                        <span className="font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                          ({mov.x}, {mov.y})
                        </span>
                      </div>
                    ))
                  )}
               </div>
               
               {telemetria.filaMovimentacoes.length > 0 && (
                 <p className="mt-4 text-[10px] text-center text-zinc-500 font-medium">
                    Mostrando últimos 10 passos
                 </p>
               )}
            </section>
          </aside>

          {/* Center: Maze Viewer */}
          <main data-testid="mapa-labirinto" className="flex-1 w-full min-h-[400px] flex flex-col justify-center items-center rounded-3xl bg-zinc-900/20 border border-zinc-800 p-4 lg:p-8 relative overflow-hidden">
             {/* Decorative Background Elements */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/5 rounded-full blur-3xl pointer-events-none" />
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

             {/* Dynamic Maze Container */}
             <div className="w-full flex items-center justify-center">
                <MazeViewer 
                  showHeader={false} 
                  showSidebar={false} 
                  standalone={false} 
                />
             </div>
             
             {/* Zoom/Pan hint if needed */}
             <div className="mt-6 flex items-center gap-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <div className="flex items-center gap-1.5">
                   <div className="h-1 w-3 bg-purple-500 rounded-full" />
                   <span>Rastro Ativo</span>
                </div>
                <div className="h-4 w-px bg-zinc-800" />
                <div className="flex items-center gap-1.5">
                   <div className="h-3 w-3 bg-green-500/20 border border-green-500/40 rounded-sm" />
                   <span>Objetivo 2x2</span>
                </div>
             </div>
          </main>
        </div>
      </div>
    </MonitoringLayout>
  );
}
