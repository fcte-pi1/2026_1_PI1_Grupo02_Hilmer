import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CorridasDashboard } from "../../components/CorridaDashboard";
import type { UseCorridasReturn } from "../../hooks/useCorrida";

describe("CorridasDashboard Integração", () => {
  it("renderiza tabela e painel de detalhes interligados", () => {
    const setTipoFiltroMock = vi.fn();
    const selecionarCorridaMock = vi.fn();

    const mockCorridas: UseCorridasReturn = {
      corridas: [
        {
          id_corrida: 1,
          data_hora_inicio: "2026-05-02T10:00:00Z",
          tempo_total: 120,
          status_corrida: "CONCLUIDA",
          velocidade_media: 25.5,
          tipo_labirinto: "16X16",
        }
      ],
      corridaSelecionada: null,
      tipoFiltro: "TODOS",
      carregandoLista: false,
      carregandoDetalhe: false,
      erro: null,
      mensagemVazio: null,
      setTipoFiltro: setTipoFiltroMock,
      selecionarCorrida: selecionarCorridaMock,
      recarregar: vi.fn(),
    };

    const { rerender } = render(<CorridasDashboard corridas={mockCorridas} />);
    
    expect(screen.getByText("Lista de corridas")).toBeInTheDocument();
    expect(screen.getByText("Selecione uma corrida na lista para ver o detalhe completo e o percurso.")).toBeInTheDocument();

    fireEvent.click(screen.getByText("16X16", { selector: 'button' }));
    expect(setTipoFiltroMock).toHaveBeenCalledWith("16X16");

    fireEvent.click(screen.getByText("16X16", { selector: 'span' }));
    expect(selecionarCorridaMock).toHaveBeenCalledWith(1);

    const mockCorridasSelected: UseCorridasReturn = {
      ...mockCorridas,
      corridaSelecionada: {
        id_corrida: 1,
        tempo_total: 120,
        tensao_media: null,
        corrente_media: null,
        velocidade_maxima_percurso: null,
        velocidade_media: 25.5,
        status_corrida: "CONCLUIDA" as const,
        desafio_cumprido: true,
        data_hora_inicio: "2026-05-02T10:00:00Z",
        data_hora_fim: "2026-05-02T10:02:00Z",
        tipo_labirinto: "16X16" as const,
        percurso: [],
        celulas: []
      }
    };

    rerender(<CorridasDashboard corridas={mockCorridasSelected} />);
    
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("Sim")).toBeInTheDocument();
  });

  it("exibe erro se houver", () => {
    const mockCorridas: UseCorridasReturn = {
      corridas: [],
      corridaSelecionada: null,
      tipoFiltro: "TODOS",
      carregandoLista: false,
      carregandoDetalhe: false,
      erro: "Falha de conexão com a API",
      mensagemVazio: null,
      setTipoFiltro: vi.fn(),
      selecionarCorrida: vi.fn(),
      recarregar: vi.fn(),
    };

    render(<CorridasDashboard corridas={mockCorridas} />);
    expect(screen.getByText("Falha de conexão com a API")).toBeInTheDocument();
  });
});