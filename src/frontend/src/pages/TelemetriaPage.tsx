import { DashboardIndicadores } from "../components/DashboardIndicadores";
import { MonitoringLayout } from "../components/MonitoringLayout";
import { EstadosContent } from "../components/EstadosContent";
import { useTelemetria } from "../hooks/useTelemetria";

type TelemetriaPageProps = {
  activeView: "telemetria" | "labirinto" | "estados";
  onNavigateTelemetria: () => void;
  onNavigateLabirinto: () => void;
  onNavigateEstados: () => void;
};

export function TelemetriaPage({
  activeView,
  onNavigateTelemetria,
  onNavigateLabirinto,
  onNavigateEstados
}: TelemetriaPageProps) {
  const telemetria = useTelemetria();

  return (
    <MonitoringLayout
      activeView={activeView}
      onNavigateTelemetria={onNavigateTelemetria}
      onNavigateLabirinto={onNavigateLabirinto}
      onNavigateEstados={onNavigateEstados}
      eyebrow={activeView === "estados" ? "Estados" : activeView === "labirinto" ? "Labirinto" : "Telemetria"}
      title={activeView === "estados" ? "Máquina de Estados do Robô" : "Métricas em tempo real do robô MM-07"}
      description="Painel de controle e monitoramento."
      statusConexao={telemetria.statusConexao}
      mensagemStatusConexao={telemetria.mensagemStatusConexao}
    >
      {activeView === "estados" && <EstadosContent />}
      {activeView === "telemetria" && <DashboardIndicadores telemetria={telemetria} />}
      {activeView === "labirinto" && <div>[Conteúdo do Labirinto]</div>}
    </MonitoringLayout>
  );
}
