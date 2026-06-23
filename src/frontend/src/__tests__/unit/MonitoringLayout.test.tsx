import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MonitoringLayout } from "../../components/MonitoringLayout";

describe("MonitoringLayout", () => {
  const defaultProps = {
    activeView: "telemetria" as const,
    onNavigateTelemetria: vi.fn(),
    onNavigateCorridas: vi.fn(),
    eyebrow: "Monitoring",
    title: "Dashboard",
    description: "System overview",
    statusConexao: "online" as const,
  };

  it("renderiza titulo e botoes de navegacao corretamente", () => {
    render(
      <MonitoringLayout {...defaultProps}>
        <div>Conteudo Teste</div>
      </MonitoringLayout>
    );
    
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Monitoring")).toBeInTheDocument();
    expect(screen.getByText("Conteudo Teste")).toBeInTheDocument();
    
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("renderiza status offline", () => {
    render(
      <MonitoringLayout {...defaultProps} statusConexao="offline">
        <div>Conteudo Teste</div>
      </MonitoringLayout>
    );
    
    expect(screen.getByText("Offline")).toBeInTheDocument();
  });

  it("renderiza status waiting", () => {
    render(
      <MonitoringLayout {...defaultProps} statusConexao="waiting">
        <div>Conteudo Teste</div>
      </MonitoringLayout>
    );
    
    expect(screen.getByText("Aguardando conexao")).toBeInTheDocument();
  });

  it("chama funcoes de navegacao", () => {
    const onNavTelemetria = vi.fn();
    const onNavCorridas = vi.fn();

    render(
      <MonitoringLayout 
        {...defaultProps} 
        onNavigateTelemetria={onNavTelemetria}
        onNavigateCorridas={onNavCorridas}
      >
        <div />
      </MonitoringLayout>
    );
    
    const corridasBtn = screen.getByTitle("Histórico");
    fireEvent.click(corridasBtn);
    expect(onNavCorridas).toHaveBeenCalled();

    const telemetriaBtn = screen.getByTitle("Monitoramento");
    fireEvent.click(telemetriaBtn);
    expect(onNavTelemetria).toHaveBeenCalled();
  });

  it("alterna colapso do menu", () => {
    render(
      <MonitoringLayout {...defaultProps}>
        <div />
      </MonitoringLayout>
    );

    expect(screen.getByText("Control Center")).toBeInTheDocument();

    const toggleBtn = screen.getByTitle("Expandir/Recolher Menu");
    fireEvent.click(toggleBtn);

    expect(screen.queryByText("Control Center")).not.toBeInTheDocument();
  });
});
