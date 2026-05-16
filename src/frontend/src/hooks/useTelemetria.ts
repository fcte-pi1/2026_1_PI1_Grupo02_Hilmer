/**
 * Hook React para conexão WebSocket de telemetria em tempo real.
 *
 * Uso:
 * ```tsx
 * const { indicadores, enviarPacote, conectado, erro } = useTelemetria();
 * ```
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { IndicadoresDesempenho, PacoteTelemetria } from "../types/telemetria";
import { WS_TELEMETRIA_URL } from "../services/telemetria";

/** Estado inicial dos indicadores (espelha criar_estado_inicial do backend). */
const ESTADO_INICIAL: IndicadoresDesempenho = {
  id_corrida: null,
  bateria_atual: null,
  velocidade_media: null,
  tempo_decorrido_ms: 0,
  tempo_final_ms: null,
  status_corrida: "aguardando",
  sucesso: null,
  ultimo_timestamp_ms: null,
  alerta_bateria_critica: false,
  alerta_dado_invalido: false,
};

/** Intervalo entre tentativas de reconexão (ms). */
const RECONNECT_INTERVAL_MS = 3000;

export interface UseTelemetriaReturn {
  /** Estado atual dos indicadores de desempenho. */
  indicadores: IndicadoresDesempenho;
  /** Envia um pacote de telemetria via WebSocket. */
  enviarPacote: (pacote: PacoteTelemetria) => void;
  /** Indica se o WebSocket está conectado. */
  conectado: boolean;
  /** Última mensagem de erro, se houver. */
  erro: string | null;
}

export function useTelemetria(): UseTelemetriaReturn {
  const [indicadores, setIndicadores] =
    useState<IndicadoresDesempenho>(ESTADO_INICIAL);
  const [conectado, setConectado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const conectar = useCallback(() => {
    // Evitar conexões duplicadas
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const ws = new WebSocket(WS_TELEMETRIA_URL);

    ws.onopen = () => {
      setConectado(true);
      setErro(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as IndicadoresDesempenho;
        setIndicadores(data);
      } catch {
        console.error("[useTelemetria] Erro ao parsear mensagem:", event.data);
      }
    };

    ws.onerror = () => {
      setErro("Erro na conexão WebSocket.");
    };

    ws.onclose = () => {
      setConectado(false);
      wsRef.current = null;

      // Reconexão automática
      reconnectTimerRef.current = setTimeout(conectar, RECONNECT_INTERVAL_MS);
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    conectar();

    return () => {
      // Cleanup ao desmontar
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [conectar]);

  const enviarPacote = useCallback((pacote: PacoteTelemetria) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(pacote));
    } else {
      console.warn("[useTelemetria] WebSocket não conectado, pacote descartado.");
    }
  }, []);

  return { indicadores, enviarPacote, conectado, erro };
}
