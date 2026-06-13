/**
 * Hook React para conexão WebSocket de telemetria em tempo real.
 *
 * Uso:
 * ```tsx
 * const { indicadores, enviarPacote, conectado, erro } = useTelemetria();
 * ```
 *
 * Em testes E2E (Playwright), o hook também escuta o evento customizado
 * 'ws-test-message' para permitir simulação de mensagens sem WebSocket real.
 * Ver e2e/pages/MonitoramentoPage.ts → simularEventoWebSocket().
 */

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import type {
  ConfigSessao,
  IndicadoresDesempenho,
  PacoteTelemetria,
} from "../types/telemetria";
import { telemetriaSocket } from "../services/telemetriaSocket";

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

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Tamanho máximo da fila de movimentações para evitar crescimento infinito. */
const MAX_FILA_MOVIMENTACOES = 200;

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

/** Tipos de mensagem WebSocket esperados (para validação). */
const TIPOS_MENSAGEM_VALIDOS = [
  "HANDSHAKE",
  "CONNECTION_STATUS",
  "CONEXAO_PERDIDA",
  "SESSAO_ENCERRADA",
  "SESSAO_INICIADA",
  "ATUALIZACAO_TELEMETRIA",
  "MOVIMENTACAO",
  "HEARTBEAT",
  "ALERTA_CRITICO",
  "ALERTA_TEMPERATURA_CRITICA",
  "ERROR",
  "ACK",
  "WS_ACK",
  "WS_ERROR",
];

// ---------------------------------------------------------------------------
// Interface de retorno do hook
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Validação de mensagens WebSocket
// ---------------------------------------------------------------------------

/**
 * Valida se uma mensagem recebida via WebSocket tem a estrutura esperada.
 * Se inválida, loga aviso no console e retorna false.
 */
function validarMensagemWebSocket(msg: unknown): msg is Record<string, unknown> {
  if (!msg || typeof msg !== "object") {
    console.warn("[useTelemetria] Mensagem ignorada: não é um objeto.", msg);
    return false;
  }

  const record = msg as Record<string, unknown>;

  if (typeof record.type !== "string") {
    console.warn("[useTelemetria] Mensagem ignorada: campo 'type' ausente ou não string.", msg);
    return false;
  }

  if (!TIPOS_MENSAGEM_VALIDOS.includes(record.type)) {
    console.warn(
      "[useTelemetria] Mensagem ignorada: tipo '%s' não reconhecido.",
      record.type,
    );
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Hook principal
// ---------------------------------------------------------------------------

export function useTelemetria(
  options?: UseTelemetriaOptions,
): UseTelemetriaReturn {
  const [indicadores, setIndicadores] = useState<IndicadoresDesempenho>(() => {
    const indicadoresSalvos = localStorage.getItem("indicadores");
    if (indicadoresSalvos) {
      const parsed = JSON.parse(indicadoresSalvos);
      if (parsed) return parsed;
    }
    return ESTADO_INICIAL;
  });

  const [configSessao, setConfigSessao] = useState<ConfigSessao>(() => {
    const configSessaoSalva = localStorage.getItem("configSessao");
    if (configSessaoSalva) {
      const parsed = JSON.parse(configSessaoSalva);
      if (parsed) return parsed;
    }
    return CONFIG_SESSAO_INICIAL;
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

  /**
   * Limpa a fila de movimentações.
   * Deve ser chamada pelo componente após processar as movimentações.
   */
  const limparFilaMovimentacoes = useCallback(() => {
    setFilaMovimentacoes([]);
  }, []);

  const signalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Garante que o "novo recorde" dispare apenas uma vez por corrida concluída.
  const recordeDisparadoRef = useRef(false);

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

  /**
   * Processa uma mensagem recebida (WebSocket real ou mock de teste).
   * Centralizado aqui para evitar duplicação.
   */
  const processarMensagem = useCallback(
    (parsed: unknown) => {
      try {
        // --- Validação de schema (CA-08-02) ---
        if (!validarMensagemWebSocket(parsed)) {
          return;
        }

        const msg = parsed as Record<string, unknown>;
        const payload = (msg.data ?? msg) as Record<string, unknown>;

        console.log("[useTelemetria] Mensagem recebida:", msg);

        // --- Tratamento de ACK (CA-08-01) ---
        if (msg.type === "ACK") {
          console.log(
            "[useTelemetria] ACK recebido para pacote tipo=%s, timestamp_ms=%s",
            payload.tipo,
            payload.timestamp_ms,
          );
          return;
        }

        if (msg.type === "ERROR") {
          toast.error((msg.message as string) || "Erro na telemetria", {
            id: "telemetria-error",
          });
          return;
        }

        if (msg.type === "CONNECTION_STATUS") {
          const data = msg.data as Record<string, unknown> | undefined;
          setStatusConexao(data?.status === "offline" ? "offline" : "online");
          setMensagemStatusConexao((data?.message as string) ?? null);
          return;
        }

        if (msg.type === "CONEXAO_PERDIDA") {
          setStatusConexao("offline");
          setMensagemStatusConexao("Conexão perdida com o Micromouse.");
          return;
        }

        if (msg.type === "SESSAO_ENCERRADA") {
          console.log("[useTelemetria] Sessão anterior encerrada:", msg.data);
          const data = msg.data as Record<string, unknown> | undefined;
          if (data?.sucesso === true) {
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
          msg.type === "MOVIMENTACAO" ||
          msg.type === "MOVIMENTACAO_PAREDES" ||
          isMovimentacaoPayload(payload)
        ) {
          if (isMovimentacaoPayload(payload)) {
            const mov = {
              ...payload,
              paredes: decodificarParedes(payload.w),
            };
            setUltimaMovimentacao(mov);
            setFilaMovimentacoes((prev) => {
              const nova = [...prev, mov];
              // Limitar tamanho da fila (CA-08-03)
              if (nova.length > MAX_FILA_MOVIMENTACOES) {
                return nova.slice(nova.length - MAX_FILA_MOVIMENTACOES);
              }
              return nova;
            });
          }
          return;
        }

        if (msg.type === "SESSAO_INICIADA") {
          const pacote = msg.data as Record<string, unknown>;
          if (pacote) {
            const { dimensao, ...indicadoresData } = pacote;
            setIndicadores(indicadoresData as unknown as IndicadoresDesempenho);
            setConfigSessao({ dimensao } as ConfigSessao);
            setStatusConexao("online");
            setMensagemStatusConexao(null);
            // Nova corrida: rearma o gatilho de "novo recorde".
            recordeDisparadoRef.current = false;
          }
        } else if (
          msg.type === "ATUALIZACAO_TELEMETRIA" ||
          msg.type === "HEARTBEAT"
        ) {
          if (msg.data) {
            const dados = msg.data as IndicadoresDesempenho;
            setIndicadores(dados);
            setStatusConexao("online");
            setMensagemStatusConexao(null);

            // Corrida concluída com sucesso: dispara refetch de melhor tempo
            // (CA-17-02). O pacote FINAL chega como ATUALIZACAO_TELEMETRIA, sem
            // passar por SESSAO_ENCERRADA (que só ocorre em aborto).
            if (
              dados.status_corrida === "concluida" &&
              dados.sucesso === true &&
              !recordeDisparadoRef.current
            ) {
              recordeDisparadoRef.current = true;
              setContadorNovoRecorde((c) => c + 1);
              onSessaoEncerradaRef.current?.();
            }
          }
        } else if (msg.type === "ALERTA_CRITICO") {
          // Alerta crítico genérico — dispara o modal de alerta
          // O componente TelemetryAlerts observa alerta_possivel_parada_inesperada
          // ou bateria crítica. Para o mock de teste, forçamos via estado.
          setIndicadores((prev) => 
            prev ? { ...prev, alerta_possivel_parada_inesperada: true } : prev
          );
        } else if (msg.type === "ALERTA_TEMPERATURA_CRITICA") {
          const pacote = msg.data as Record<string, unknown>;
          if (pacote) {
            const { temp_c, ...indicadoresData } = pacote;
            setIndicadores(indicadoresData as unknown as IndicadoresDesempenho);
            setStatusConexao("online");
            setMensagemStatusConexao(null);
            toast.error(
              `Alerta Crítico: Temperatura em ${temp_c}ºC! Corrida abortada.`,
              { id: "alerta-temperatura", duration: 5000 },
            );
          }
        }
      } catch (e) {
        console.error("[useTelemetria] Erro ao processar mensagem:", e);
      }
    },
    [decodificarParedes, isMovimentacaoPayload],
  );

  useEffect(() => {
    localStorage.setItem("indicadores", JSON.stringify(indicadores));
    localStorage.setItem("configSessao", JSON.stringify(configSessao));
  }, [indicadores, configSessao]);

  useEffect(() => {
    // Inscreve-se no WebSocket compartilhado (singleton). Todos os consumidores
    // do hook dividem UMA única conexão, evitando sockets duplicados.
    const unsubscribe = telemetriaSocket.subscribe({
      onMessage: (parsed) => processarMensagem(parsed),
      onOpen: () => {
        setConectado(true);
        setErro(null);
      },
      onClose: () => {
        setConectado(false);
      },
      onError: () => {
        setErro("Erro na conexão WebSocket.");
      },
    });

    return unsubscribe;
  }, [processarMensagem]);

  /**
   * Listener para eventos de mock de teste (Playwright E2E).
   * O Page Object MonitoramentoPage.simularEventoWebSocket() dispara
   * o evento 'ws-test-message' com o payload como detail.
   */
  useEffect(() => {
    const handleTestMessage = (event: Event) => {
      const customEvent = event as CustomEvent;
      processarMensagem(customEvent.detail);
    };

    window.addEventListener("ws-test-message", handleTestMessage);
    return () => {
      window.removeEventListener("ws-test-message", handleTestMessage);
    };
  }, [processarMensagem]);

  const enviarPacote = useCallback((pacote: PacoteTelemetria) => {
    // Envia pacote no formato esperado pelo WebSocket bidirecional
    const enviado = telemetriaSocket.send({ type: "PACOTE", data: pacote });
    if (!enviado) {
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