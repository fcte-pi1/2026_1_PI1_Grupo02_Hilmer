import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DashboardIndicadores } from "../../components/DashboardIndicadores";
import {
  mockAguardando,
  mockTemperaturaCritica,
  mockTemperaturaNormal,
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

// ── CT-TEMP-01
describe("CT-TEMP-01 — Card de Temperatura: renderização do indicador", () => {
  beforeEach(() => { configurarHook(mockAguardando, false); });

  it("renderiza o label 'Temperatura'", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByText("Temperatura")).toBeInTheDocument();
  });

  it("exibe '-- °C' quando temperatura_atual é null", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByTestId("indicador-temperatura")).toBeInTheDocument();
    expect(screen.getByText("-- °C")).toBeInTheDocument();
  });

  it("renderiza o card com data-testid correto", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByTestId("indicador-temperatura")).toBeInTheDocument();
  });
});

// ── CT-TEMP-02
describe("CT-TEMP-02 — Temperatura Normal: sem alerta visual", () => {
  beforeEach(() => { configurarHook(mockTemperaturaNormal, true); });

  it("exibe o valor de temperatura normal com uma casa decimal", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByText("45.0 °C")).toBeInTheDocument();
  });

  it("NÃO exibe o banner de alerta de temperatura crítica", () => {
    render(<DashboardIndicadores />);
    expect(screen.queryByText(/Temperatura crítica/i)).not.toBeInTheDocument();
  });

  it("NÃO exibe o card com borda vermelha", () => {
    render(<DashboardIndicadores />);
    const card = screen.getByTestId("indicador-temperatura");
    expect(card.className).not.toContain("border-rose-500");
  });

  it("exibe o valor em cor branca (não crítica)", () => {
    render(<DashboardIndicadores />);
    const card = screen.getByTestId("indicador-temperatura");
    const valorEl = card.querySelector("span:last-child");
    expect(valorEl?.className).not.toContain("text-rose-400");
  });
});

// ── CT-TEMP-03
describe("CT-TEMP-03 — Temperatura Crítica: alerta visual ativo", () => {
  beforeEach(() => { configurarHook(mockTemperaturaCritica, true); });

  it("exibe o valor de temperatura crítica", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByText("75.3 °C")).toBeInTheDocument();
  });

  it("exibe o banner de alerta de temperatura crítica", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByTestId("alerta-temperatura-critica")).toBeInTheDocument();
    expect(screen.getByText(/Temperatura crítica: 75.3°C/i)).toBeInTheDocument();
  });

  it("exibe o card com borda vermelha", () => {
    render(<DashboardIndicadores />);
    const card = screen.getByTestId("indicador-temperatura");
    expect(card.className).toContain("border-rose-500");
  });

  it("exibe o valor em cor vermelha pulsante", () => {
    render(<DashboardIndicadores />);
    const card = screen.getByTestId("indicador-temperatura");
    const valorEl = card.querySelector("span:last-child");
    expect(valorEl?.className).toContain("text-rose-400");
    expect(valorEl?.className).toContain("animate-pulse");
  });
});

// ── CT-TEMP-04
describe("CT-TEMP-04 — Temperatura pelo limiar: alerta_temperatura_critica=false mas temp >= 60", () => {
  beforeEach(() => {
    configurarHook(
      criarIndicadores({ alerta_temperatura_critica: false, temperatura_atual: 60.0 }),
      true,
    );
  });

  it("exibe o banner de alerta mesmo sem flag do backend quando temp >= 60", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByTestId("alerta-temperatura-critica")).toBeInTheDocument();
  });

  it("exibe o valor 60.0 °C", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByText("60.0 °C")).toBeInTheDocument();
  });
});

// ── CT-TEMP-05
describe("CT-TEMP-05 — Temperatura abaixo do limiar: sem alerta", () => {
  beforeEach(() => {
    configurarHook(
      criarIndicadores({ alerta_temperatura_critica: false, temperatura_atual: 59.9 }),
      true,
    );
  });

  it("NÃO exibe o banner de alerta quando temp < 60 e flag false", () => {
    render(<DashboardIndicadores />);
    expect(screen.queryByTestId("alerta-temperatura-critica")).not.toBeInTheDocument();
  });

  it("exibe o valor 59.9 °C sem cor crítica", () => {
    render(<DashboardIndicadores />);
    expect(screen.getByText("59.9 °C")).toBeInTheDocument();
    const card = screen.getByTestId("indicador-temperatura");
    expect(card.className).not.toContain("border-rose-500");
  });
});