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

type MovimentacaoTelemetria = {
  id_corrida: number;
  timestamp_ms: number;
  x: number;
  y: number;
  w: number;
  paredes: ParedesCelula;
};

type ParedesCelula = {
  norte: boolean;
  sul: boolean;
  leste: boolean;
  oeste: boolean;
};

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
  alerta_possivel_parada_inesperada: false,
  alerta_dado_invalido: false,
  alerta_temperatura_critica: false,
  log_alertas: [],
};

const CONFIG_SESSAO_INICIAL: ConfigSessao = {
  dimensao: null,
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
  /** Ultima movimentacao recebida (mudanca de celula). */
  ultimaMovimentacao: MovimentacaoTelemetria | null;
  /** Fila com todas as movimentacoes recebidas na sessao (para nao perder nada no render). */
  filaMovimentacoes: MovimentacaoTelemetria[];
  /** Limpa a fila apos processar */
  limparFilaMovimentacoes: () => void;
  /**
   * Indica ausência de sinal de telemetria por mais de 3 segundos.
   */
  alertaSemSinal: boolean;
  /**
   * Contador incrementado a cada SESSAO_ENCERRADA com sucesso=true.
   * Componentes podem usar como dependência para disparar refetch.
   * (CA-17-02)
   */
  contadorNovoRecorde: number;
}

type UseTelemetriaOptions = {
  /**
   * Callback chamado quando SESSAO_ENCERRADA chega com sucesso=true.
   * Use para disparar refetch do melhor tempo e exibir toast de novo recorde.
   */
  onSessaoEncerradaComSucesso?: () => void;
};

export function useTelemetria(
  options?: UseTelemetriaOptions,
): UseTelemetriaReturn {
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
  const [mensagemStatusConexao, setMensagemStatusConexao] = useState<
    string | null
  >(null);
  const [ultimaMovimentacao, setUltimaMovimentacao] =
    useState<MovimentacaoTelemetria | null>(null);
  const [filaMovimentacoes, setFilaMovimentacoes] = useState<
    MovimentacaoTelemetria[]
  >([]);
  const [contadorNovoRecorde, setContadorNovoRecorde] = useState(0);
  const [alertaSemSinal, setAlertaSemSinal] = useState(false);

  // Ref para manter o callback sempre atualizado sem recriar o WebSocket
  const onSessaoEncerradaRef = useRef(options?.onSessaoEncerradaComSucesso);
  useEffect(() => {
    onSessaoEncerradaRef.current = options?.onSessaoEncerradaComSucesso;
  }, [options?.onSessaoEncerradaComSucesso]);

  const limparFilaMovimentacoes = useCallback(() => {
    setFilaMovimentacoes([]);
  }, []);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Monitora ausência de sinal
  useEffect(() => {
    if (signalTimerRef.current) clearTimeout(signalTimerRef.current);
    
    if (alertaSemSinal) setAlertaSemSinal(false);

    if (indicadores.status_corrida === "em_andamento") {
      signalTimerRef.current = setTimeout(() => {
        setAlertaSemSinal(true);
      }, 3000);
    }

    return () => {
      if (signalTimerRef.current) clearTimeout(signalTimerRef.current);
    };
  }, [indicadores.status_corrida, indicadores.ultimo_timestamp_ms, alertaSemSinal]);

  const decodificarParedes = useCallback((w: number): ParedesCelula => {
    return {
      norte: (w & 1) === 1,
      sul: (w & 2) === 2,
      leste: (w & 4) === 4,
      oeste: (w & 8) === 8,
    };
  }, []);

  const isMovimentacaoPayload = useCallback(
    (
      data: unknown,
    ): data is {
      id_corrida: number;
      timestamp_ms: number;
      x: number;
      y: number;
      w: number;
    } => {
      if (!data || typeof data !== "object") {
        return false;
      }

      const payload = data as Record<string, unknown>;

      return (
        typeof payload.id_corrida === "number" &&
        typeof payload.timestamp_ms === "number" &&
        typeof payload.x === "number" &&
        typeof payload.y === "number" &&
        typeof payload.w === "number"
      );
    },
    [],
  );

  useEffect(() => {
    localStorage.setItem("indicadores", JSON.stringify(indicadores));
    localStorage.setItem("configSessao", JSON.stringify(configSessao));
  }, [indicadores, configSessao]);

  const realizarConexao = useCallback(function conectar() {
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
        const payload = parsed?.data ?? parsed;
        console.log("[useTelemetria] Mensagem recebida INICIAL:", parsed);

        if (parsed.type === "ERROR") {
          toast.error(parsed.message || "Erro na telemetria", {
            id: "telemetria-error",
          });
          return;
        }

        if (parsed.type === "CONNECTION_STATUS") {
          setStatusConexao(
            parsed.data?.status === "offline" ? "offline" : "online",
          );
          setMensagemStatusConexao(parsed.data?.message ?? null);
          return;
        }

        if (parsed.type === "SESSAO_ENCERRADA") {
          console.log(
            "[useTelemetria] Sessão anterior encerrada:",
            parsed.data,
          );

          // CA-17-02: se a sessão foi encerrada com sucesso, pode haver novo recorde
          if (parsed.data?.sucesso === true) {
            setContadorNovoRecorde((c) => c + 1);
            onSessaoEncerradaRef.current?.();
          }

          setIndicadores(ESTADO_INICIAL);
          setConfigSessao(CONFIG_SESSAO_INICIAL);
          setStatusConexao("waiting");
          setMensagemStatusConexao(null);
          return;
        }

        if (
          parsed?.type === "MOVIMENTACAO" ||
          parsed?.type === "MOVIMENTACAO_PAREDES" ||
          isMovimentacaoPayload(payload)
        ) {
          if (isMovimentacaoPayload(payload)) {
            const mov = {
              ...payload,
              paredes: decodificarParedes(payload.w),
            };
            setUltimaMovimentacao(mov);
            setFilaMovimentacoes((prev) => [...prev, mov]);
          }
          return;
        }

        const pacote = parsed?.data;

        if (parsed.type === "SESSAO_INICIADA") {
          const { dimensao, ...indicadoresData } = pacote;
          setIndicadores(indicadoresData as IndicadoresDesempenho);
          setConfigSessao({ dimensao });
          setStatusConexao("online");
          setMensagemStatusConexao(null);
        } else if (
          parsed.type === "ATUALIZACAO_TELEMETRIA" ||
          parsed.type === "HEARTBEAT"
        ) {
          setIndicadores(pacote as IndicadoresDesempenho);
          setStatusConexao("online");
          setMensagemStatusConexao(null);
        } else if (parsed.type === "ALERTA_TEMPERATURA_CRITICA") {
          const { temp_c, ...indicadoresData } = pacote;
          setIndicadores(indicadoresData as IndicadoresDesempenho);
          setStatusConexao("online");
          setMensagemStatusConexao(null);
          toast.error(
            `Alerta Crítico: Temperatura em ${temp_c}ºC! Corrida abortada.`,
            {
              id: "alerta-temperatura",
              duration: 5000,
            },
          );
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
      reconnectTimerRef.current = setTimeout(conectar, RECONNECT_INTERVAL_MS);
    };

    wsRef.current = ws;
  }, [decodificarParedes, isMovimentacaoPayload]);

  useEffect(() => {
    realizarConexao();

    return () => {
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
    ultimaMovimentacao,
    filaMovimentacoes,
    limparFilaMovimentacoes,
    alertaSemSinal,
    contadorNovoRecorde,
  };
}