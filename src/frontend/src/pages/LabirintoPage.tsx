import MazeViewer from "../components/maze/MazeViewer";
import { MonitoringLayout } from "../components/MonitoringLayout";
import { useTelemetria } from "../hooks/useTelemetria";

type LabirintoPageProps = {
  activeView: "telemetria" | "labirinto" | "estados";
  onNavigateTelemetria: () => void;
  onNavigateLabirinto: () => void;
  onNavigateEstados: () => void;
};

export function LabirintoPage({
  activeView,
  onNavigateTelemetria,
  onNavigateLabirinto,
  onNavigateEstados,
}: LabirintoPageProps) {
  const { statusConexao, mensagemStatusConexao } = useTelemetria();

  return (
    <MonitoringLayout
      activeView={activeView}
      onNavigateTelemetria={onNavigateTelemetria}
      onNavigateLabirinto={onNavigateLabirinto}
      onNavigateEstados={onNavigateEstados}
      eyebrow="Labirinto"
      title="Mapa do labirinto em tempo real"
      description="Visualize paredes detectadas, percurso e posicao atual do Micromouse."
      statusConexao={statusConexao}
      mensagemStatusConexao={mensagemStatusConexao}
    >
      <MazeViewer />
    </MonitoringLayout>
  );
}
