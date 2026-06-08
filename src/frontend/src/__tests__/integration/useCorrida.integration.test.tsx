import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCorridas } from "../../hooks/useCorrida";

const mockListarCorridasResumo = vi.fn();
const mockObterCorrida = vi.fn();

vi.mock("../../services/corrida", () => ({
  listarCorridasResumo: (...args: unknown[]) => mockListarCorridasResumo(...args),
  obterCorrida: (...args: unknown[]) => mockObterCorrida(...args),
}));

describe("useCorrida Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve iniciar carregando e buscar a lista de corridas inicial", async () => {
    mockListarCorridasResumo.mockResolvedValueOnce([
      { id_corrida: 1, status_corrida: "CONCLUIDA" }
    ]);

    const { result } = renderHook(() => useCorridas());

    expect(result.current.carregandoLista).toBe(true);

    await waitFor(() => {
      expect(result.current.carregandoLista).toBe(false);
    });

    expect(result.current.corridas).toHaveLength(1);
    expect(result.current.erro).toBeNull();
  });

  it("deve alterar o tipoFiltro e buscar novamente", async () => {
    mockListarCorridasResumo.mockResolvedValue([
      { id_corrida: 1, status_corrida: "CONCLUIDA" }
    ]);

    const { result } = renderHook(() => useCorridas());

    await waitFor(() => {
      expect(result.current.carregandoLista).toBe(false);
    });

    act(() => {
      result.current.setTipoFiltro("16X16");
    });

    expect(result.current.tipoFiltro).toBe("16X16");
    expect(mockListarCorridasResumo).toHaveBeenCalledWith("16X16");
  });

  it("deve lidar com lista vazia e definir mensagem", async () => {
    mockListarCorridasResumo.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useCorridas());

    await waitFor(() => {
      expect(result.current.carregandoLista).toBe(false);
    });

    expect(result.current.corridas).toHaveLength(0);
    expect(result.current.mensagemVazio).toBe("Nenhuma corrida registrada");
  });

  it("deve lidar com erros ao carregar lista", async () => {
    mockListarCorridasResumo.mockRejectedValueOnce(new Error("API Error List"));

    const { result } = renderHook(() => useCorridas());

    await waitFor(() => {
      expect(result.current.carregandoLista).toBe(false);
    });

    expect(result.current.erro).toBe("API Error List");
  });

  it("deve selecionar corrida e buscar detalhes", async () => {
    mockListarCorridasResumo.mockResolvedValueOnce([]);
    mockObterCorrida.mockResolvedValueOnce({ id_corrida: 42, status_corrida: "CONCLUIDA", percurso: [] });

    const { result } = renderHook(() => useCorridas());

    await waitFor(() => {
      expect(result.current.carregandoLista).toBe(false);
    });

    act(() => {
      result.current.selecionarCorrida(42);
    });

    expect(result.current.carregandoDetalhe).toBe(true);

    await waitFor(() => {
      expect(result.current.carregandoDetalhe).toBe(false);
    });

    expect(result.current.corridaSelecionada?.id_corrida).toBe(42);
    expect(mockObterCorrida).toHaveBeenCalledWith(42);
  });

  it("deve lidar com erro ao buscar detalhes", async () => {
    mockListarCorridasResumo.mockResolvedValueOnce([]);
    mockObterCorrida.mockRejectedValueOnce(new Error("Detail Error"));

    const { result } = renderHook(() => useCorridas());

    await waitFor(() => {
      expect(result.current.carregandoLista).toBe(false);
    });

    act(() => {
      result.current.selecionarCorrida(42);
    });

    await waitFor(() => {
      expect(result.current.carregandoDetalhe).toBe(false);
    });

    expect(result.current.erro).toBe("Detail Error");
  });
});
