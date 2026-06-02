import { DashboardIndicadores } from '../components/DashboardIndicadores';
import { MonitoringLayout } from '../components/MonitoringLayout';
import { useTelemetria } from '../hooks/useTelemetria';

type TelemetriaPageProps = {
  activeView: 'telemetria' | 'labirinto' | 'corridas';
  onNavigateTelemetria: () => void;
  onNavigateLabirinto: () => void;
  onNavigateCorridas: () => void;
};

export function TelemetriaPage({
  activeView,
  onNavigateTelemetria,
  onNavigateLabirinto,
  onNavigateCorridas,
}: TelemetriaPageProps) {
  const telemetria = useTelemetria();

  return (
    <MonitoringLayout
      activeView={activeView}
      onNavigateTelemetria={onNavigateTelemetria}
      onNavigateLabirinto={onNavigateLabirinto}
      onNavigateCorridas={onNavigateCorridas}
      eyebrow="Telemetria"
      title="Métricas em tempo real do robô MM-07"
      description="Acompanhe os indicadores exigidos para avaliação da corrida: bateria, velocidade média e tempo de execução."
      statusConexao={telemetria.statusConexao}
      mensagemStatusConexao={telemetria.mensagemStatusConexao}
    >
      <DashboardIndicadores telemetria={telemetria} />
    </MonitoringLayout>
  );
}
