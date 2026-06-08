import React from 'react';
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EstadosContent } from "../../components/EstadosContent";
import { useTelemetria } from "../../hooks/useTelemetria";

// Mock do hook de telemetria
vi.mock("../../hooks/useTelemetria", () => ({
  useTelemetria: vi.fn(),
}));

const mockUseTelemetria = vi.mocked(useTelemetria);

// Mocks locais em conformidade com as propriedades lidas no useEffect do componente
const mockSetupAguardando = {
  ultimo_timestamp_ms: 0,
  status_corrida: "aguardando",
  bateria_atual: 100,
  alerta_temperatura_critica: false,
  sucesso: null,
};

const mockMapeamentoAtivo = {
  ultimo_timestamp_ms: 5000,
  status_corrida: "em_andamento",
  bateria_atual: 45,
  alerta_temperatura_critica: false,
  sucesso: null,
};

const mockBateriaCritica = {
  ultimo_timestamp_ms: 8000,
  status_corrida: "em_andamento",
  bateria_atual: 8,
  alerta_temperatura_critica: false,
  sucesso: null,
};

const mockDesafioConcluido = {
  ultimo_timestamp_ms: 12000,
  status_corrida: "concluida",
  bateria_atual: 80,
  alerta_temperatura_critica: false,
  sucesso: true,
};

function configurarHook(indicadores: any, statusConexao = "online", ultimaMovimentacao = null) {
  mockUseTelemetria.mockReturnValue({
    indicadores,
    statusConexao,
    configSessao: { dimensao: "16x16" },
    ultimaMovimentacao,
  } as unknown as ReturnType<typeof useTelemetria>);
}

// ── CT01 — Estado de Inicialização e Configuração
describe("CT01 — Configuração Inicial: renderização com robô parado", () => {
  beforeEach(() => { 
    configurarHook(mockSetupAguardando, "online"); 
  });

  it("exibe o título do fluxo da máquina de estados", () => {
    render(<EstadosContent />);
    expect(screen.getByText("Fluxo da Máquina de Estados")).toBeInTheDocument();
  });

  it("marca a etapa 1 (Configuração) como ativa na interface gráfica", () => {
    render(<EstadosContent />);
    expect(screen.getByText("Inicialização Validada")).toBeInTheDocument();
  });

  it("mostra o temporizador de Setup (Config) como 'Recebido'", () => {
    render(<EstadosContent />);
    expect(screen.getByText("Recebido")).toBeInTheDocument();
  });

  it("mostra o tempo de exploração zerado inicialmente", () => {
    render(<EstadosContent />);
    expect(screen.getByText("0.0s")).toBeInTheDocument();
  });

  it("registra o pacote de configuração nominal na tabela de auditoria", () => {
    render(<EstadosContent />);
    expect(screen.getByText(/Pacote Configuração: Sessão criada para labirinto/i)).toBeInTheDocument();
  });
});

// ── CT02 — Mapeamento Ativo e Alertas Passivos nos Logs
describe("CT02 — Mapeamento Dinâmico: alertas inseridos como telemetria passiva", () => {
  it("computa e exibe o tempo incremental de exploração em movimento", () => {
    configurarHook(mockMapeamentoAtivo, "online");
    render(<EstadosContent />);
    expect(screen.getByText("5.0s")).toBeInTheDocument();
    expect(screen.getByText("Exploração Ativa")).toBeInTheDocument();
  });

  it("dispara o aviso de bateria fraca na tabela sem quebrar o estado visual de mapeamento", () => {
    configurarHook(mockBateriaCritica, "online");
    render(<EstadosContent />);
    
    // O alerta deve constar na auditoria
    expect(screen.getByText("AVISO: BATERIA CRÍTICA")).toBeInTheDocument();
    expect(screen.getByText(/Nível de energia perigoso: Micromouse operando com apenas 8/i)).toBeInTheDocument();
    
    // O robô DEVE continuar na fase visual de mapeamento ativo (não chaveia para falha de forma autônoma)
    expect(screen.getByText("Exploração Ativa")).toBeInTheDocument();
  });
});

// ── CT03 — Finalização e Conclusão Nominal
describe("CT03 — Resolução de Labirinto: interrupção controlada pelo backend", () => {
  beforeEach(() => { 
    configurarHook(mockDesafioConcluido, "online"); 
  });

  it("identifica o pacote de desfecho positivo e altera a visualização para sucesso", () => {
    render(<EstadosContent />);
    expect(screen.getByText("Desafio Cumprido!")).toBeInTheDocument();
  });

  it("commita o log linear registrando a persistência de dados no banco", () => {
    render(<EstadosContent />);
    expect(screen.getByText("Desafio finalizado com sucesso! Centro alcançado de forma autônoma.")).toBeInTheDocument();
    expect(screen.getByText(/Pacote Fim de Corrida: Labirinto solucionado! Dados gravados no banco./i)).toBeInTheDocument();
  });
});