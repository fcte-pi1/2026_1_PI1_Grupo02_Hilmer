import MazeViewer from "../components/maze/MazeViewer";
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
  const { statusConexao, mensagemStatusConexao } = useTelemetria();

  return (
    <MonitoringLayout
      activeView={activeView}
      onNavigateTelemetria={onNavigateTelemetria}
      onNavigateLabirinto={onNavigateLabirinto}
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
