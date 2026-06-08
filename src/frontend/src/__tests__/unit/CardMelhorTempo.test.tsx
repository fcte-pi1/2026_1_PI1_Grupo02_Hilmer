import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CardMelhorTempo } from "../../components/CardMelhorTempo";
import type { MelhorTempoResponse } from "../../types/corrida";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../../hooks/useMelhorTempo", () => ({
  useMelhorTempo: vi.fn(),
}));

import { useMelhorTempo } from "../../hooks/useMelhorTempo";
const mockUseMelhorTempo = vi.mocked(useMelhorTempo);

// ---------------------------------------------------------------------------
// Dados de teste
// ---------------------------------------------------------------------------

const mockMelhorTempo: MelhorTempoResponse = {
  id_corrida: 11,
  tempo_total: 93210,
  data_hora_fim: "2026-05-01T14:30:00",
  tipo_labirinto: "4X4",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function configurarHookAutonomo(
  melhorTempo: MelhorTempoResponse | null,
  loading = false,
  erro: string | null = null,
) {
  mockUseMelhorTempo.mockReturnValue({
    melhorTempo,
    loading,
    erro,
    refetch: vi.fn(),
  });
}

// ---------------------------------------------------------------------------
// CT-CMT-01 — Estado de carregamento
// ---------------------------------------------------------------------------

describe("CT-CMT-01 — Estado de carregamento", () => {
  beforeEach(() => {
    configurarHookAutonomo(null, true);
  });

  it("exibe skeletons enquanto carrega (modo autônomo)", () => {
    const { container } = render(<CardMelhorTempo tipo="4X4" />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("NÃO exibe o título enquanto carrega", () => {
    render(<CardMelhorTempo tipo="4X4" />);
    expect(screen.queryByText(/Melhor Performance em/i)).not.toBeInTheDocument();
  });

  it("exibe skeletons enquanto carrega (modo controlado)", () => {
    const { container } = render(<CardMelhorTempo tipo="4X4" melhorTempo={null} loading={true} erro={null} />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// CT-CMT-02 — Estado vazio (CA-17-03)
// ---------------------------------------------------------------------------

describe("CT-CMT-02 — Estado vazio: nenhum desafio concluído (CA-17-03)", () => {
  beforeEach(() => {
    configurarHookAutonomo(null, false);
  });

  it("exibe 'Sem dados para este labirinto' no card Sessão", () => {
    render(<CardMelhorTempo tipo="4X4" />);
    expect(
      screen.getByText("Sem dados para este labirinto"),
    ).toBeInTheDocument();
  });

  it("exibe '--/--/----' nos cards de Tempo Total e Data", () => {
    render(<CardMelhorTempo tipo="4X4" />);
    const valores = screen.getAllByText(/--/);
    expect(valores.length).toBeGreaterThanOrEqual(2);
  });

  it("exibe o título 'Melhor Performance em 4X4'", () => {
    render(<CardMelhorTempo tipo="4X4" />);
    expect(screen.getByText(/Melhor Performance em 4X4/i)).toBeInTheDocument();
  });

  it("NÃO exibe o badge de recorde registrado", () => {
    render(<CardMelhorTempo tipo="4X4" />);
    expect(
      screen.queryByText(/RECORDE ESTABELECIDO/i),
    ).not.toBeInTheDocument();
  });

  it("exibe estado vazio via props controladas (CA-17-03)", () => {
    render(
      <CardMelhorTempo tipo="4X4" melhorTempo={null} loading={false} erro={null} />,
    );
    expect(
      screen.getByText("Sem dados para este labirinto"),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// CT-CMT-03 — Estado com recorde (CA-17-01, CA-17-04)
// ---------------------------------------------------------------------------

describe("CT-CMT-03 — Estado com recorde: exibe dados da corrida (CA-17-01, CA-17-04)", () => {
  beforeEach(() => {
    configurarHookAutonomo(mockMelhorTempo, false);
  });

  it("exibe o id_corrida formatado (CA-17-04)", () => {
    render(<CardMelhorTempo tipo="4X4" />);
    expect(screen.getByText("#11")).toBeInTheDocument();
  });

  it("exibe o tempo_total formatado via formatarTempo (CA-17-04)", () => {
    render(<CardMelhorTempo tipo="4X4" />);
    // 93210ms = 01:33.210
    expect(screen.getByText("01:33.210")).toBeInTheDocument();
  });

  it("exibe a data_hora_fim formatada (CA-17-04)", () => {
    render(<CardMelhorTempo tipo="4X4" />);
    // 2026-05-01T14:30:00 → "01/05/2026, 14:30"
    expect(screen.getByText(/01\/05\/2026/)).toBeInTheDocument();
  });

  it("exibe o badge 'RECORDE ESTABELECIDO'", () => {
    render(<CardMelhorTempo tipo="4X4" />);
    expect(screen.getByText(/RECORDE ESTABELECIDO/i)).toBeInTheDocument();
  });

  it("exibe os labels dos três cards", () => {
    render(<CardMelhorTempo tipo="4X4" />);
    expect(screen.getByText("Sessão")).toBeInTheDocument();
    expect(screen.getByText("Tempo Total")).toBeInTheDocument();
    expect(screen.getByText("Data da Conquista")).toBeInTheDocument();
  });

  it("exibe dados via props controladas", () => {
    render(
      <CardMelhorTempo
        tipo="4X4"
        melhorTempo={mockMelhorTempo}
        loading={false}
        erro={null}
      />,
    );
    expect(screen.getByText("01:33.210")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// CT-CMT-04 — Estado de erro
// ---------------------------------------------------------------------------

describe("CT-CMT-04 — Estado de erro", () => {
  beforeEach(() => {
    configurarHookAutonomo(null, false, "Erro de conexão");
  });

  it("exibe mensagem de erro", () => {
    render(<CardMelhorTempo tipo="4X4" />);
    expect(screen.getByText(/Erro ao carregar recorde/i)).toBeInTheDocument();
    expect(screen.getByText(/Erro de conexão/i)).toBeInTheDocument();
  });

  it("NÃO exibe o título 'Melhor Performance em 4X4' em estado de erro", () => {
    render(<CardMelhorTempo tipo="4X4" />);
    expect(screen.queryByText(/Melhor Performance em 4X4/i)).not.toBeInTheDocument();
  });

  it("exibe erro via props controladas", () => {
    render(
      <CardMelhorTempo
        tipo="4X4"
        melhorTempo={null}
        loading={false}
        erro="Erro de conexão"
      />,
    );
    expect(screen.getByText(/Erro de conexão/i)).toBeInTheDocument();
  });
});