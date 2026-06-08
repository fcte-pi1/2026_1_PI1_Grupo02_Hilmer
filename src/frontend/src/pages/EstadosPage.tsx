import { MonitoringLayout } from "../components/MonitoringLayout";
import { TopIndicators, TelemetryAlerts } from "../components/DashboardIndicadores";
import { useTelemetria } from "../hooks/useTelemetria";
import { EstadosContent } from "../components/EstadosContent"; // Ajuste o caminho se necessário

type EstadosPageProps = {
  activeView: "telemetria" | "labirinto" | "corridas" | "estados";
  onNavigateTelemetria: () => void;
  onNavigateLabirinto: () => void;
  onNavigateCorridas: () => void;
  onNavigateEstados: () => void;
};

export function EstadosPage({
  activeView,
  onNavigateTelemetria,
  onNavigateLabirinto,
  onNavigateCorridas,
  onNavigateEstados,
}: EstadosPageProps) {
  const telemetria = useTelemetria();

  return (
    <MonitoringLayout
      activeView={activeView}
      onNavigateTelemetria={onNavigateTelemetria}
      onNavigateLabirinto={onNavigateLabirinto}
      onNavigateCorridas={onNavigateCorridas}
      onNavigateEstados={onNavigateEstados}
      eyebrow="Máquina de Estados"
      title="Ciclo de Vida Lógico do Micromouse"
      description="Monitore as transições lógicas em tempo real baseadas nos pacotes recebidos do Floodfill e da telemetria ativa."
      statusConexao={telemetria.statusConexao}
      mensagemStatusConexao={telemetria.mensagemStatusConexao}
    >
      <div className="flex flex-col gap-4 max-w-[1600px] mx-auto w-full">
        {/* Indicadores compactos do topo */}
        <TopIndicators telemetria={telemetria} />

        {/* Alertas globais, se houverem */}
        <TelemetryAlerts telemetria={telemetria} />

        {/* Conteúdo principal com a lógica dos estados e WebSocket dedicado */}
        <EstadosContent />
      </div>
    </MonitoringLayout>
  );
}