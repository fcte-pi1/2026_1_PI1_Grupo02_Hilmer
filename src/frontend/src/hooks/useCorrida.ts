import { useCallback, useEffect, useState } from "react";

import {
  iniciarCorrida as postIniciarCorrida,
  listarCorridasResumo,
  obterCorrida,
  salvarCorrida as postSalvarCorrida,
} from "../services/corrida";
import type {
  CorridaDetailResponse,
  CorridaResumoResponse,
  CorridaSave,
  CorridaStart,
  TipoLabirintoFiltro,
} from "../types/corrida";

export interface UseCorridasReturn {
  corridas: CorridaResumoResponse[];
  corridaSelecionada: CorridaDetailResponse | null;
  tipoFiltro: TipoLabirintoFiltro;
  carregandoLista: boolean;
  carregandoDetalhe: boolean;
  erro: string | null;
  mensagemVazio: string | null;
  setTipoFiltro: (tipo: TipoLabirintoFiltro) => void;
  selecionarCorrida: (idCorrida: number) => Promise<void>;
  recarregar: () => Promise<void>;
  iniciarCorrida: (payload: CorridaStart) => Promise<void>;
  salvarCorrida: (idCorrida: number, payload: CorridaSave) => Promise<void>;
}

export function useCorridas(): UseCorridasReturn {
  const [corridas, setCorridas] = useState<CorridaResumoResponse[]>([]);
  const [corridaSelecionada, setCorridaSelecionada] =
    useState<CorridaDetailResponse | null>(null);
  const [tipoFiltro, setTipoFiltro] =
    useState<TipoLabirintoFiltro>("TODOS");
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemVazio, setMensagemVazio] = useState<string | null>(null);

  const carregarCorridas = useCallback(async () => {
    setCarregandoLista(true);
    setErro(null);
    setMensagemVazio(null);

    try {
      const lista = await listarCorridasResumo(tipoFiltro);
      setCorridas(lista);
      setCorridaSelecionada(null);

      if (lista.length === 0) {
        setMensagemVazio(
          tipoFiltro === "TODOS"
            ? "Nenhuma corrida registrada"
            : "Nenhuma corrida registrada para este labirinto",
        );
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar corridas");
    } finally {
      setCarregandoLista(false);
    }
  }, [tipoFiltro]);

  useEffect(() => {
    void carregarCorridas();
  }, [carregarCorridas]);

  const selecionarCorrida = useCallback(async (idCorrida: number) => {
    setCarregandoDetalhe(true);
    setErro(null);

    try {
      const detalhe = await obterCorrida(idCorrida);
      setCorridaSelecionada(detalhe);
    } catch (err) {
      setErro(
        err instanceof Error
          ? err.message
          : "Erro ao carregar detalhes da corrida",
      );
    } finally {
      setCarregandoDetalhe(false);
    }
  }, []);

  const iniciarCorrida = useCallback(
    async (payload: CorridaStart) => {
      setErro(null);

      try {
        await postIniciarCorrida(payload);
        await carregarCorridas();
      } catch (err) {
        setErro(
          err instanceof Error ? err.message : "Erro ao iniciar corrida",
        );
        throw err;
      }
    },
    [carregarCorridas],
  );

  const salvarCorrida = useCallback(
    async (idCorrida: number, payload: CorridaSave) => {
      setErro(null);

      try {
        await postSalvarCorrida(idCorrida, payload);
        await carregarCorridas();
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Erro ao salvar corrida");
        throw err;
      }
    },
    [carregarCorridas],
  );

  return {
    corridas,
    corridaSelecionada,
    tipoFiltro,
    carregandoLista,
    carregandoDetalhe,
    erro,
    mensagemVazio,
    setTipoFiltro,
    selecionarCorrida,
    recarregar: carregarCorridas,
    iniciarCorrida,
    salvarCorrida,
  };
}