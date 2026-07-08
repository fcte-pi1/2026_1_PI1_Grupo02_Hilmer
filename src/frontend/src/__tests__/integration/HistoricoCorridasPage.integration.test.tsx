import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { HistoricoCorridasPage } from "../../pages/HistoricoCorridasPage";

const mockListarCorridasResumo = vi.fn();
const mockRefetchMelhorTempo = vi.fn();

vi.mock("../../services/corrida", () => ({
  listarCorridasResumo: (...args: unknown[]) => mockListarCorridasResumo(...args),
}));

vi.mock("../../hooks/useMelhorTempo", () => ({
  useMelhorTempo: () => ({
    melhorTempo: null,
    loading: false,
    erro: null,
    refetch: mockRefetchMelhorTempo,
  }),
}));

vi.mock("../../hooks/useTelemetria", () => ({
  useTelemetria: () => ({
    statusConexao: "connected",
    mensagemStatusConexao: "Conectado",
  }),
}));

vi.mock("../../components/CardMelhorTempo", () => ({
  CardMelhorTempo: () => <div data-testid="card-melhor-tempo" />,
}));

vi.mock("../../components/MonitoringLayout", () => ({
  MonitoringLayout: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("../../components/corrida/CorridaDetailOverlay", () => ({
  CorridaDetailOverlay: () => <div data-testid="detalhe-corrida" />,
}));

describe("HistoricoCorridasPage", () => {
  it("exibe bateria inicial e final na tabela de histórico", async () => {
    mockListarCorridasResumo.mockResolvedValueOnce([
      {
        id_corrida: 1,
        data_hora_inicio: "2026-06-14T10:00:00Z",
        tempo_total: 15000,
        status_corrida: "CONCLUIDA",
        velocidade_media: 0.25,
        bateria_inicial: 100,
        bateria_final: 85,
        tipo_labirinto: "4X4",
      },
    ]);

    render(
      <HistoricoCorridasPage
        activeView="corridas"
        onNavigateTelemetria={vi.fn()}
        onNavigateCorridas={vi.fn()}
      />,
    );

    expect(await screen.findByText("Bateria Inicial")).toBeInTheDocument();
    expect(screen.getByText("Bateria Final")).toBeInTheDocument();
    expect(await screen.findByText("100%")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
  });
});
