import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DashboardIndicadores } from "../../components/DashboardIndicadores";
import {
  mockAguardando,
  mockBateriaCritica,
  mockBateriaNormal,
} from "../utils/telemetria-mocks";

vi.mock("../../hooks/useTelemetria", () => ({
  useTelemetria: vi.fn(),
}));

Object.defineProperty(window, "AudioContext", {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    createOscillator: vi.fn(() => ({
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      frequency: { setValueAtTime: vi.fn() },
      type: "square",
    })),
    createGain: vi.fn(() => ({
      connect: vi.fn(),
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
    })),
    destination: {},
    currentTime: 0,
    state: "running",
    close: vi.fn().mockResolvedValue(undefined),
  })),
});

import { useTelemetria } from "../../hooks/useTelemetria";
const mockUseTelemetria = vi.mocked(useTelemetria);

function configurarHook(
  indicadores: typeof mockAguardando | null,
  conectado = false,
) {
  mockUseTelemetria.mockReturnValue({
    indicadores: indicadores ?? undefined,
    conectado,
    configSessao: { dimensao: null, tentativa: null },
    enviarPacote: vi.fn(),
    erro: null,
  } as ReturnType<typeof useTelemetria>);
}

// ── CT01 
describe("CT01 — Estado Vazio: renderização sem dados de telemetria", () => {
  beforeEach(() => { configurarHook(mockAguardando, false); });

  it("renderiza o título principal do dashboard", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByText("Indicadores de Desempenho")).toBeInTheDocument();
  });

  it("exibe status 'Aguardando' no badge de corrida", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByText(/Corrida: Aguardando/i)).toBeInTheDocument();
  });

  it("exibe '--' como valor de bateria", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByText("--%")).toBeInTheDocument();
  });

  it("exibe '-- cm/s' como valor de velocidade", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByText("-- cm/s")).toBeInTheDocument();
  });

  it("exibe '00:00.000' como tempo", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByText("00:00.000")).toBeInTheDocument();
  });

  it("exibe descrição 'Aguardando telemetria' no card de bateria", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByText("Aguardando telemetria")).toBeInTheDocument();
  });

  it("exibe descrição 'Aguardando largada' no card de tempo", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByText("Aguardando largada")).toBeInTheDocument();
  });

  it("exibe 'WebSocket: Desconectado'", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByText(/WebSocket: Desconectado/i)).toBeInTheDocument();
  });

  it("NÃO exibe alerta de bateria crítica", () => {
    render(<DashboardIndicadores />);
    expect(screen.queryByText(/Bateria crítica/i)).not.toBeInTheDocument();
  });

  it("NÃO exibe alerta de ausência de telemetria", () => {
    render(<DashboardIndicadores />);
    expect(screen.queryByText(/Ausência de telemetria recente/i)).not.toBeInTheDocument();
  });

  it("NÃO exibe modal de alerta crítico", () => {
    render(<DashboardIndicadores />);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});

// ── CT03 
describe("CT03 — Alerta de Bateria Crítica: bateria <= 10%", () => {
  beforeEach(() => { configurarHook(mockBateriaCritica, true); });

  it("exibe o banner de alerta de bateria crítica", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByText(/Bateria crítica: nível em/i)).toBeInTheDocument();
  });

  it("exibe o valor real da bateria no card", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByText("8.0%")).toBeInTheDocument();
  });

  it("exibe 'Bateria crítica' como descrição no card", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByText("Bateria crítica")).toBeInTheDocument();
  });

  it("abre o modal de alerta crítico", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("exibe o título correto no modal", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByText(/Nível de bateria ≤ 10%/i)).toBeInTheDocument();
  });
});

// ── CT04 
describe("CT04 — Bateria Normal: bateria > 10%", () => {
  beforeEach(() => { configurarHook(mockBateriaNormal, true); });

  it("exibe o valor de bateria normal no card", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByText("15.0%")).toBeInTheDocument();
  });

  it("NÃO exibe o banner de alerta de bateria crítica", () => {
    render(<DashboardIndicadores />);
    expect(screen.queryByText(/Bateria crítica: nível em/i)).not.toBeInTheDocument();
  });

  it("NÃO exibe o modal de alerta crítico", () => {
    render(<DashboardIndicadores />);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("exibe 'Última bateria conhecida' como descrição", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByText("Última bateria conhecida")).toBeInTheDocument();
  });

  it("exibe 'WebSocket: Conectado'", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByText(/WebSocket: Conectado/i)).toBeInTheDocument();
  });

  it("exibe status 'Em andamento'", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByText(/Corrida: Em andamento/i)).toBeInTheDocument();
  });
});