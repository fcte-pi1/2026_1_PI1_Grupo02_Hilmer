import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SessionManager from "../../components/Session";
import { useTelemetria } from "../../hooks/useTelemetria";

vi.mock("../../hooks/useTelemetria", () => ({
  useTelemetria: vi.fn(),
}));

describe("SessionManager", () => {
  const mockUseTelemetria = vi.mocked(useTelemetria);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza estado de conexao conectando", () => {
    mockUseTelemetria.mockReturnValue({
      indicadores: { status_corrida: "aguardando", bateria_inicial: null },
      configSessao: { dimensao: null },
      conectado: false,
      erro: null,
    } as ReturnType<typeof useTelemetria>);

    render(<SessionManager />);
    expect(screen.getByText("Conectando...")).toBeInTheDocument();
    expect(screen.getByText("Aguardando Inicialização")).toBeInTheDocument();
  });

  it("renderiza erro se houver", () => {
    mockUseTelemetria.mockReturnValue({
      indicadores: { status_corrida: "aguardando", bateria_inicial: null },
      configSessao: { dimensao: null },
      conectado: true,
      erro: "Falha de comunicação",
    } as ReturnType<typeof useTelemetria>);

    render(<SessionManager />);
    expect(screen.getByText("Falha de comunicação")).toBeInTheDocument();
  });

  it("renderiza sessão iniciada quando status é em_andamento", () => {
    mockUseTelemetria.mockReturnValue({
      indicadores: { status_corrida: "em_andamento", bateria_inicial: 95 },
      configSessao: { dimensao: "16X16" },
      conectado: true,
      erro: null,
    } as ReturnType<typeof useTelemetria>);

    render(<SessionManager />);
    expect(screen.getByText("Sessão Iniciada!")).toBeInTheDocument();
    expect(screen.getByText("16X16")).toBeInTheDocument();
    expect(screen.getByText("95%")).toBeInTheDocument();
  });

  it("chama onNavigate ao clicar em Ir para o Monitoramento", () => {
    mockUseTelemetria.mockReturnValue({
      indicadores: { status_corrida: "em_andamento", bateria_inicial: 95 },
      configSessao: { dimensao: "16X16" },
      conectado: true,
      erro: null,
    } as ReturnType<typeof useTelemetria>);

    const onNavigateMock = vi.fn();
    render(<SessionManager onNavigate={onNavigateMock} />);
    
    fireEvent.click(screen.getByText("Ir para o Monitoramento"));
    expect(onNavigateMock).toHaveBeenCalledTimes(1);
  });

  it("renderiza botao de pular quando nao iniciada e onNavigate fornecido", () => {
    mockUseTelemetria.mockReturnValue({
      indicadores: { status_corrida: "aguardando", bateria_inicial: null },
      configSessao: { dimensao: null },
      conectado: true,
      erro: null,
    } as ReturnType<typeof useTelemetria>);

    const onNavigateMock = vi.fn();
    render(<SessionManager onNavigate={onNavigateMock} />);
    
    const skipBtn = screen.getByText("Abrir monitoramento e labirinto");
    expect(skipBtn).toBeInTheDocument();
    fireEvent.click(skipBtn);
    expect(onNavigateMock).toHaveBeenCalledTimes(1);
  });
});
