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
) {
  mockUseTelemetria.mockReturnValue({
    indicadores,
    conectado,
    configSessao: { dimensao: null, tentativa: null },
    enviarPacote: vi.fn(),
    erro: null,
  } as ReturnType<typeof useTelemetria>);
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
    expect(screen.getByText("-- cm/s")).toBeInTheDocument();
    expect(screen.getByText("00:00.000")).toBeInTheDocument();

    act(() => {
      configurarHook(mockEmAndamento, true);
      rerender(<DashboardIndicadores />);
    });

    expect(screen.getByText("72.5%")).toBeInTheDocument();
    expect(screen.getByText("35.87 cm/s")).toBeInTheDocument();
    expect(screen.getByText("01:05.430")).toBeInTheDocument();
  });

  it("exibe status 'Em andamento' após receber pacote válido", () => {
    configurarHook(mockAguardando, false);
    const { rerender } = render(<DashboardIndicadores />);

    act(() => {
      configurarHook(mockEmAndamento, true);
      rerender(<DashboardIndicadores />);
    });

    expect(screen.getByText(/Corrida: Em andamento/i)).toBeInTheDocument();
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

  it("formata velocidade com exatamente 2 casas decimais", () => {
    configurarHook(criarIndicadores({ velocidade_media: 0.1 }), true);
    render(<DashboardIndicadores />);
    expect(screen.getByText("0.10 cm/s")).toBeInTheDocument();
  });
});

// ── CT06 
describe("CT06 — Queda de Telemetria", () => {
  it("exibe alerta após 3 segundos sem pacote", () => {
    configurarHook(mockEmAndamento, true);
    render(<DashboardIndicadores />);

    expect(screen.queryByText(/Ausência de telemetria recente/i)).not.toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(3001); });

    expect(screen.getByText(/Ausência de telemetria recente/i)).toBeInTheDocument();
  });

  it("NÃO exibe alerta se pacote chegar antes de 3 segundos", () => {
    configurarHook(mockEmAndamento, true);
    const { rerender } = render(<DashboardIndicadores />);

    act(() => { vi.advanceTimersByTime(1000); });

    act(() => {
      configurarHook(criarIndicadores({ ultimo_timestamp_ms: Date.now() + 1000 }), true);
      rerender(<DashboardIndicadores />);
    });

    act(() => { vi.advanceTimersByTime(2000); });

    expect(screen.queryByText(/Ausência de telemetria recente/i)).not.toBeInTheDocument();
  });

  it("mantém a última bateria conhecida durante falha de telemetria", () => {
    configurarHook(mockEmAndamento, true);
    const { rerender } = render(<DashboardIndicadores />);

    expect(screen.getByText("72.5%")).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(3001); });

    expect(screen.getByText("72.5%")).toBeInTheDocument();
    expect(screen.getByText(/Ausência de telemetria recente/i)).toBeInTheDocument();

    act(() => {
      configurarHook(mockEmAndamento, false);
      rerender(<DashboardIndicadores />);
    });

    expect(screen.getByText("72.5%")).toBeInTheDocument();
  });

  it("NÃO exibe alerta de sem sinal quando corrida está aguardando", () => {
    configurarHook(mockAguardando, false);
    render(<DashboardIndicadores />);

    act(() => { vi.advanceTimersByTime(5000); });

    expect(screen.queryByText(/Ausência de telemetria recente/i)).not.toBeInTheDocument();
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

  it("exibe o título 'Tempo final' após conclusão", () => {
    configurarHook(mockConcluida, true);
    render(<DashboardIndicadores />);
    expect(screen.getByText("Tempo final")).toBeInTheDocument();
    expect(screen.queryByText("Tempo decorrido")).not.toBeInTheDocument();
  });

  it("exibe descrição 'Tempo fixado após conclusão'", () => {
    configurarHook(mockConcluida, true);
    render(<DashboardIndicadores />);
    expect(screen.getByText("Tempo fixado após conclusão")).toBeInTheDocument();
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
});