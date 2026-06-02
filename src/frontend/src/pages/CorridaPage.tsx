import { MonitoringLayout } from "../components/MonitoringLayout";
import { CorridasDashboard } from ".././components/CorridaDashboard";
import { useCorridas } from "../hooks/useCorrida";

type CorridasPageProps = {
  activeView: "telemetria" | "labirinto" | "corridas";
  onNavigateTelemetria: () => void;
  onNavigateLabirinto: () => void;
  onNavigateCorridas: () => void;
};

export function CorridasPage({
  activeView,
  onNavigateTelemetria,
  onNavigateLabirinto,
  onNavigateCorridas,
}: CorridasPageProps) {
  const corridas = useCorridas();

  return (
    <MonitoringLayout
      activeView={activeView}
      onNavigateTelemetria={onNavigateTelemetria}
      onNavigateLabirinto={onNavigateLabirinto}
      onNavigateCorridas={onNavigateCorridas}
      eyebrow="Corridas"
      title="Consulta e registro de corridas"
      description="Visualize o histórico, aplique filtros por tipo de labirinto e acesse os detalhes de cada corrida."
      statusConexao="online"
      mensagemStatusConexao="API disponível"
    >
      <CorridasDashboard corridas={corridas} />
    </MonitoringLayout>
  );
}