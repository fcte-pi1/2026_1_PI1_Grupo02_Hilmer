import { useEffect, useRef, useState } from "react";

import type { HistoricoEstado } from "../types/estados";
import type { IndicadoresDesempenho } from "../types/telemetria";

export function useHistoricoEstados(
  indicadores: IndicadoresDesempenho
) {
  const [historico, setHistorico] = useState<HistoricoEstado[]>([]);

  const ultimoEstado = useRef<string | null>(null);

  useEffect(() => {
    const estadoAtual = indicadores.status_corrida;

    if (estadoAtual === ultimoEstado.current) {
      return;
    }

    ultimoEstado.current = estadoAtual;

    const descricao =
      estadoAtual === "aguardando"
        ? "Aguardando início"
        : estadoAtual === "em_andamento"
        ? "Corrida em andamento"
        : estadoAtual === "concluida"
        ? "Desafio cumprido"
        : "Desafio não cumprido";

    setHistorico((prev) => [
      {
        tempo: new Date().toLocaleTimeString(),
        estado: estadoAtual,
        descricao,
      },
      ...prev,
    ]);
  }, [indicadores.status_corrida]);

  return historico;
}