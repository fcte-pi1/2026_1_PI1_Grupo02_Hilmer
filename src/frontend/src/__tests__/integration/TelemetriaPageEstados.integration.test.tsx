import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TelemetriaPage } from "../../pages/TelemetriaPage";
import {
  mockConcluida,
  mockEmAndamento,
  mockFalha,
} from "../utils/telemetria-mocks";
import type { UseTelemetriaReturn } from "../../hooks/useTelemetria";

vi.mock("../../components/maze/MazeViewer", () => ({
  default: () => <div data-testid="maze-viewer" />,
}));

vi.mock("../../components/DashboardIndicadores", () => ({
  TopIndicators: () => <div data-testid="top-indicators" />,
  ControlPanel: () => <div data-testid="control-panel" />,
  TelemetryAlerts: () => null,
}));

vi.mock("../../hooks/useTelemetria", () => ({
  useTelemetria: vi.fn(),
}));

import { useTelemetria } from "../../hooks/useTelemetria";

const mockUseTelemetria = vi.mocked(useTelemetria);

function criarTelemetria(
  indicadores: UseTelemetriaReturn["indicadores"],
): UseTelemetriaReturn {
  return {
    indicadores,
    configSessao: { dimensao: 16 },
    statusConexao: "online",
    mensagemStatusConexao: null,
    enviarPacote: vi.fn(),
    conectado: true,
    erro: null,
    ultimaMovimentacao: null,
    filaMovimentacoes: [],
    limparFilaMovimentacoes: vi.fn(),
    alertaSemSinal: false,
    contadorNovoRecorde: 0,
  };
}

function renderizarPagina(indicadores: UseTelemetriaReturn["indicadores"]) {
  mockUseTelemetria.mockReturnValue(criarTelemetria(indicadores));

  return render(
    <TelemetriaPage
      activeView="telemetria"
      onNavigateTelemetria={vi.fn()}
      onNavigateCorridas={vi.fn()}
    />,
  );
}

describe("TelemetriaPage - estados da corrida", () => {
  it("exibe o estado de corrida em andamento no monitoramento", () => {
    renderizarPagina(mockEmAndamento);

    expect(
      screen.getByRole("heading", { name: "Corrida em andamento" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Histórico de Estados")).toBeInTheDocument();
    expect(screen.getAllByText("Corrida em andamento").length).toBeGreaterThan(1);
  });

  it("atualiza o card e o histórico para desafio cumprido", () => {
    const { rerender } = renderizarPagina(mockEmAndamento);

    mockUseTelemetria.mockReturnValue(criarTelemetria(mockConcluida));
    rerender(
      <TelemetriaPage
        activeView="telemetria"
        onNavigateTelemetria={vi.fn()}
        onNavigateCorridas={vi.fn()}
      />,
    );

    const heading = screen.getByRole("heading", { name: "Desafio cumprido" });
    const card = heading.closest("section");

    expect(card).not.toBeNull();
    expect(card).toHaveClass("bg-emerald-500/10");
    expect(screen.getAllByText("Desafio cumprido").length).toBeGreaterThan(1);
  });

  it("atualiza o card e o histórico para desafio não cumprido", () => {
    const { rerender } = renderizarPagina(mockEmAndamento);

    mockUseTelemetria.mockReturnValue(criarTelemetria(mockFalha));
    rerender(
      <TelemetriaPage
        activeView="telemetria"
        onNavigateTelemetria={vi.fn()}
        onNavigateCorridas={vi.fn()}
      />,
    );

    const heading = screen.getByRole("heading", {
      name: "Desafio não cumprido",
    });
    const card = heading.closest("section");

    expect(card).not.toBeNull();
    expect(card).toHaveClass("bg-rose-500/10");
    expect(screen.getAllByText("Desafio não cumprido").length).toBeGreaterThan(1);
  });
});
