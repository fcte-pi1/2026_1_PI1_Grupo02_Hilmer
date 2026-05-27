/**
 * Hook React para conexão WebSocket de telemetria em tempo real.
 *
 * Uso:
 * ```tsx
 * const { indicadores, enviarPacote, conectado, erro } = useTelemetria();
 * ```
 */

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import type {
  ConfigSessao,
  IndicadoresDesempenho,
  PacoteTelemetria,
} from "../types/telemetria";
import { WS_TELEMETRIA_URL } from "../services/telemetria";

type StatusConexaoMicromouse = "online" | "offline" | "waiting";

/** Estado inicial dos indicadores (espelha criar_estado_inicial do backend). */
const ESTADO_INICIAL: IndicadoresDesempenho = {
  id_corrida_banco: null,
  sessao_hardware_id: null,
  bateria_inicial: null,
  bateria_atual: null,
  bateria_final: null,
  velocidade_media: null,
  tempo_decorrido_ms: 0,
  tempo_final_ms: null,
  status_corrida: "aguardando",
  sucesso: null,
  ultimo_timestamp_ms: null,
  alerta_bateria_critica: false,
  alerta_dado_invalido: false,
};

const CONFIG_SESSAO_INICIAL: ConfigSessao = {
  dimensao: null,
  tentativa: null,
};

/** Intervalo entre tentativas de reconexão (ms). */
const RECONNECT_INTERVAL_MS = 3000;

export interface UseTelemetriaReturn {
  /** Estado atual dos indicadores de desempenho. */
  indicadores: IndicadoresDesempenho;
  /** Dados de configuração da sessão (recebidos uma única vez). */
  configSessao: ConfigSessao;
  /** Estado atual da conexão com o Micromouse. */
  statusConexao: StatusConexaoMicromouse;
  /** Última mensagem enviada pelo backend sobre a conexão. */
  mensagemStatusConexao: string | null;
  /** Envia um pacote de telemetria via WebSocket. */
  enviarPacote: (pacote: PacoteTelemetria) => void;
  /** Indica se o WebSocket está conectado. */
  conectado: boolean;
  /** Última mensagem de erro, se houver. */
  erro: string | null;
}

export function useTelemetria(): UseTelemetriaReturn {
  const [indicadores, setIndicadores] = useState<IndicadoresDesempenho>(() => {
    const indicadoresSalvos = localStorage.getItem("indicadores");
    return indicadoresSalvos ? JSON.parse(indicadoresSalvos) : ESTADO_INICIAL;
  });

  const [configSessao, setConfigSessao] = useState<ConfigSessao>(() => {
    const configSessaoSalva = localStorage.getItem("configSessao");
    return configSessaoSalva
      ? JSON.parse(configSessaoSalva)
      : CONFIG_SESSAO_INICIAL;
  });

  const [conectado, setConectado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [statusConexao, setStatusConexao] =
    useState<StatusConexaoMicromouse>("waiting");
  const [mensagemStatusConexao, setMensagemStatusConexao] = useState<string | null>(null);


  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  //Persistir estado no localStorage para manter dados entre recarregamentos
  useEffect(() => {
    localStorage.setItem("indicadores", JSON.stringify(indicadores));
    localStorage.setItem("configSessao", JSON.stringify(configSessao));
  }, [indicadores, configSessao]);

  const realizarConexao = useCallback(function conectar() {
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
        const parsed = JSON.parse(event.data);
        
        // Tratar erros enviados pelo backend
        if (parsed.type === "ERROR") {
          toast.error(parsed.message || "Erro na telemetria", {
            id: "telemetria-error", // Evita toasts duplicados
          });
          return;
        }

        if (parsed.type === "CONNECTION_STATUS") {
          setStatusConexao(parsed.data?.status === "offline" ? "offline" : "online");
          setMensagemStatusConexao(parsed.data?.message ?? null);
          return;
        }

        if (parsed.type === "SESSAO_ENCERRADA") {
          console.log("[useTelemetria] Sessão anterior encerrada:", parsed.data);
          setIndicadores(ESTADO_INICIAL);
          setConfigSessao(CONFIG_SESSAO_INICIAL);
          setStatusConexao("waiting");
          setMensagemStatusConexao(null);
          return;
        }

        const pacote = parsed?.data;

        if (parsed.type === "SESSAO_INICIADA") {
          const { dimensao, tentativa, ...indicadoresData } = pacote;
          setIndicadores(indicadoresData as IndicadoresDesempenho);
          setConfigSessao({ dimensao, tentativa });
          setStatusConexao("online");
          setMensagemStatusConexao(null);
        } else if (parsed.type === "ATUALIZACAO_TELEMETRIA") {
          setIndicadores(pacote as IndicadoresDesempenho);
          setStatusConexao("online");
          setMensagemStatusConexao(null);
        }
      } catch (e) {
        console.error("[useTelemetria] Erro ao processar mensagem:", e);
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
    realizarConexao();

    return () => {
      // Cleanup ao desmontar
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [realizarConexao]);

  const enviarPacote = useCallback((pacote: PacoteTelemetria) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(pacote));
    } else {
      console.warn(
        "[useTelemetria] WebSocket não conectado, pacote descartado.",
      );
    }
  }, []);

  return {
    indicadores,
    configSessao,
    statusConexao,
    mensagemStatusConexao,
    enviarPacote,
    conectado,
    erro,
  };
}
