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
    statusConexao: conectado ? "online" : "waiting",
    mensagemStatusConexao: null,
    conectado,
    configSessao: { dimensao: null },
    enviarPacote: vi.fn(),
    erro: null,
    ultimaMovimentacao: null,
    filaMovimentacoes: [],
    limparFilaMovimentacoes: vi.fn(),
    contadorNovoRecorde: 0,
  } as unknown as ReturnType<typeof useTelemetria>);
}

// ── CT01 
describe("CT01 — Estado Vazio: renderização sem dados de telemetria", () => {
  beforeEach(() => { configurarHook(mockAguardando, false); });

  it("renderiza o label de Bateria", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByText("Bateria")).toBeInTheDocument();
  });

  it("exibe o label Controle da Sessão", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByText("Controle da Sessão")).toBeInTheDocument();
  });

  it("exibe '--' como valor de bateria", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByText("--%")).toBeInTheDocument();
  });

  it("exibe '--' como valor de velocidade quando sem dados", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByText("--")).toBeInTheDocument();
  });

  it("exibe '00:00.000' como tempo", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByText("00:00.000")).toBeInTheDocument();
  });

  it("exibe modo de execução 'Aguardando'", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByText("Aguardando")).toBeInTheDocument();
  });

  it("exibe status 'Offline' quando desconectado", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByText("Offline")).toBeInTheDocument();
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
    expect(screen.getByText(/Bateria crítica/i)).toBeInTheDocument();
  });

  it("exibe o valor real da bateria no card", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByText("8.0%")).toBeInTheDocument();
  });

  it("abre o modal de alerta crítico", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
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
    expect(screen.queryByText(/Bateria crítica/i)).not.toBeInTheDocument();
  });

  it("NÃO exibe o modal de alerta crítico", () => {
    render(<DashboardIndicadores />);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("exibe status 'Online' quando conectado", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("exibe modo de execução 'Mapeamento' quando em andamento", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByText("Mapeamento")).toBeInTheDocument();
  });
});
