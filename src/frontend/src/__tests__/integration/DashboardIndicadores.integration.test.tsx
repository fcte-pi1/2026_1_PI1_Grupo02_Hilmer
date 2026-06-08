import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DashboardIndicadores } from "../../components/DashboardIndicadores";
import {
  mockAguardando,
  mockEmAndamento,
  mockConcluida,
  criarIndicadores,
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
  indicadores: ReturnType<typeof criarIndicadores> | typeof mockAguardando,
  conectado = true,
  alertaSemSinal = false,
) {
  mockUseTelemetria.mockReturnValue({
    indicadores,
    statusConexao: conectado ? "online" : "waiting",
    mensagemStatusConexao: null,
    conectado,
    configSessao: { dimensao: null },
    enviarPacote: vi.fn(),
    erro: null,
    ultimaMovimentacao: null,
    filaMovimentacoes: [],
    limparFilaMovimentacoes: vi.fn(),
    alertaSemSinal,
    contadorNovoRecorde: 0,
  } as unknown as ReturnType<typeof useTelemetria>);
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.clearAllMocks();
});

// ── CT05 
describe("CT05 — Atualização em Tempo Real", () => {
  it("atualiza bateria, velocidade e tempo simultaneamente", () => {
    configurarHook(mockAguardando, false);
    const { rerender } = render(<DashboardIndicadores />);

    expect(screen.getByText("--%")).toBeInTheDocument();
    expect(screen.getByText("--")).toBeInTheDocument();
    expect(screen.getByText("00:00.000")).toBeInTheDocument();

    act(() => {
      configurarHook(mockEmAndamento, true);
      rerender(<DashboardIndicadores />);
    });

    expect(screen.getByText("72.5%")).toBeInTheDocument();
    expect(screen.getByText("35.9 cm/s")).toBeInTheDocument();
    expect(screen.getByText("01:05.430")).toBeInTheDocument();
  });

  it("exibe modo de execução 'Mapeamento' após receber pacote válido", () => {
    configurarHook(mockAguardando, false);
    const { rerender } = render(<DashboardIndicadores />);

    act(() => {
      configurarHook(mockEmAndamento, true);
      rerender(<DashboardIndicadores />);
    });

    expect(screen.getByText("Mapeamento")).toBeInTheDocument();
  });

  it("atualiza o tempo quando segundo pacote chega", () => {
    const segundoPacote = criarIndicadores({ tempo_decorrido_ms: 70000 });

    configurarHook(mockEmAndamento, true);
    const { rerender } = render(<DashboardIndicadores />);
    expect(screen.getByText("01:05.430")).toBeInTheDocument();

    act(() => {
      configurarHook(segundoPacote, true);
      rerender(<DashboardIndicadores />);
    });

    expect(screen.getByText("01:10.000")).toBeInTheDocument();
  });

  it("formata velocidade com exatamente 1 casa decimal", () => {
    configurarHook(criarIndicadores({ velocidade_media: 0.1 }), true);
    render(<DashboardIndicadores />);
    expect(screen.getByText("0.1 cm/s")).toBeInTheDocument();
  });
});

// ── CT06 
describe("CT06 — Queda de Telemetria", () => {
  it("exibe alerta quando alertaSemSinal é verdadeiro", () => {
    configurarHook(mockEmAndamento, true, true);
    render(<DashboardIndicadores />);

    expect(screen.getByText(/Ausência de telemetria recente/i)).toBeInTheDocument();
  });

  it("NÃO exibe alerta quando alertaSemSinal é falso", () => {
    configurarHook(mockEmAndamento, true, false);
    render(<DashboardIndicadores />);

    expect(screen.queryByText(/Ausência de telemetria recente/i)).not.toBeInTheDocument();
  });

  it("mantém a última bateria conhecida durante falha de telemetria", () => {
    configurarHook(mockEmAndamento, true, false);
    const { rerender } = render(<DashboardIndicadores />);

    expect(screen.getByText("72.5%")).toBeInTheDocument();

    act(() => {
      configurarHook(mockEmAndamento, true, true);
      rerender(<DashboardIndicadores />);
    });

    expect(screen.getByText("72.5%")).toBeInTheDocument();
    expect(screen.getByText(/Ausência de telemetria recente/i)).toBeInTheDocument();

    act(() => {
      configurarHook(mockEmAndamento, false, true);
      rerender(<DashboardIndicadores />);
    });

    expect(screen.getByText("72.5%")).toBeInTheDocument();
  });
});

// ── CT07 
describe("CT07 — Encerramento de Corrida", () => {
  it("exibe o tempo final após pacote de conclusão", () => {
    configurarHook(mockEmAndamento, true);
    const { rerender } = render(<DashboardIndicadores />);
    expect(screen.getByText("01:05.430")).toBeInTheDocument();

    act(() => {
      configurarHook(mockConcluida, true);
      rerender(<DashboardIndicadores />);
    });

    expect(screen.getByText("01:33.210")).toBeInTheDocument();
  });

  it("mantém o tempo final fixo após re-renders", () => {
    configurarHook(mockConcluida, true);
    const { rerender } = render(<DashboardIndicadores />);
    expect(screen.getByText("01:33.210")).toBeInTheDocument();

    act(() => { rerender(<DashboardIndicadores />); });

    expect(screen.getByText("01:33.210")).toBeInTheDocument();
  });

  it("exibe a bateria final após conclusão", () => {
    configurarHook(mockConcluida, true);
    render(<DashboardIndicadores />);
    expect(screen.getByText("61.0%")).toBeInTheDocument();
  });

  it("mantém a bateria final fixada após re-renders", () => {
    configurarHook(mockConcluida, true);
    const { rerender } = render(<DashboardIndicadores />);
    expect(screen.getByText("61.0%")).toBeInTheDocument();

    act(() => { rerender(<DashboardIndicadores />); });

    expect(screen.getByText("61.0%")).toBeInTheDocument();
  });

  it("NÃO exibe alerta de sem sinal após conclusão", () => {
    configurarHook(mockConcluida, true);
    render(<DashboardIndicadores />);

    act(() => { vi.advanceTimersByTime(5000); });

    expect(screen.queryByText(/Ausência de telemetria recente/i)).not.toBeInTheDocument();
  });

  it("exibe modo 'Finalizado' após conclusão da corrida", () => {
    configurarHook(mockConcluida, true);
    render(<DashboardIndicadores />);
    expect(screen.getByText("Finalizado")).toBeInTheDocument();
  });
});
