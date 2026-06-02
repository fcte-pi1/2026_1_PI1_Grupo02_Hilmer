import MazeViewer from "../components/maze/MazeViewer";
import { TopIndicators, ControlPanel, TelemetryAlerts } from "../components/DashboardIndicadores";
import { MonitoringLayout } from "../components/MonitoringLayout";
import { useTelemetria } from "../hooks/useTelemetria";

type LabirintoPageProps = {
  activeView: "telemetria" | "labirinto";
  onNavigateTelemetria: () => void;
  onNavigateLabirinto: () => void;
};

export function LabirintoPage({
  activeView,
  onNavigateTelemetria,
  onNavigateLabirinto,
}: LabirintoPageProps) {
  const telemetria = useTelemetria();

  return (
    <MonitoringLayout
      activeView={activeView}
      onNavigateTelemetria={onNavigateTelemetria}
      onNavigateLabirinto={onNavigateLabirinto}
      eyebrow="Monitoramento"
      title="Micromouse"
      description="Painel de Controle Integrado em Tempo Real"
      statusConexao={telemetria.statusConexao}
      mensagemStatusConexao={telemetria.mensagemStatusConexao}
    >
      <div className="flex flex-col gap-4 max-w-[1600px] mx-auto w-full">
        {/* Top compact indicators */}
        <TopIndicators telemetria={telemetria} />

        {/* Alerts if any */}
        <TelemetryAlerts telemetria={telemetria} />

        {/* Main Grid: Control Panel + Maze */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          <div className="w-full lg:w-48 xl:w-56 flex-shrink-0">
            <ControlPanel telemetria={telemetria} />
          </div>

          <div className="flex-1 w-full flex flex-col justify-center items-center rounded-2xl bg-zinc-900/30 border border-zinc-800/80 p-4 lg:p-6 shadow-sm overflow-hidden">
            <MazeViewer showHeader={false} showSidebar={false} standalone={false} />
          </div>
        </div>
      </div>
    </MonitoringLayout>
  );
}
