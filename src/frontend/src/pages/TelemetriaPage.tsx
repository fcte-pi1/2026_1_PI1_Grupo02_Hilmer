import { DashboardIndicadores } from '../components/DashboardIndicadores';
import { MonitoringLayout } from '../components/MonitoringLayout';
import { useTelemetria } from '../hooks/useTelemetria';

type TelemetriaPageProps = {
  activeView: 'telemetria' | 'labirinto';
  onNavigateTelemetria: () => void;
  onNavigateLabirinto: () => void;
};

export function TelemetriaPage({
  activeView,
  onNavigateTelemetria,
  onNavigateLabirinto,
}: TelemetriaPageProps) {
  const telemetria = useTelemetria();

  return (
    <MonitoringLayout
      activeView={activeView}
      onNavigateTelemetria={onNavigateTelemetria}
      onNavigateLabirinto={onNavigateLabirinto}
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
