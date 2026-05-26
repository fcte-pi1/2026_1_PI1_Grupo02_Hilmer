/**
 * Hook React para conexão WebSocket de telemetria em tempo real.
 *
 * Uso:
 * ```tsx
 * const { indicadores, enviarPacote, conectado, erro } = useTelemetria();
 * ```
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  ConfigSessao,
  IndicadoresDesempenho,
  PacoteTelemetria,
} from "../types/telemetria";
import { WS_TELEMETRIA_URL } from "../services/telemetria";

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

type TipoPacoteTelemetria = "inicial" | "movimentacao" | "final" | "desconhecido";

type ResultadoValidacao = {
  valido: boolean;
  erros: string[];
};

const REGEX_INT = /^-?\d+$/;
const REGEX_NUM = /^-?\d+(?:\.\d+)?$/;

const formatarValor = (valor: unknown): string => {
  if (valor === undefined) {
    return "undefined";
  }

  if (valor === null) {
    return "null";
  }

  if (typeof valor === "string") {
    return `"${valor}"`;
  }

  try {
    return JSON.stringify(valor);
  } catch {
    return String(valor);
  }
};

const isRegistro = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === "object" && valor !== null && !Array.isArray(valor);

const isInteiro = (valor: unknown): boolean => {
  if (typeof valor === "number") {
    return Number.isInteger(valor);
  }

  if (typeof valor === "string") {
    return REGEX_INT.test(valor.trim());
  }

  return false;
};

const isNumero = (valor: unknown): boolean => {
  if (typeof valor === "number") {
    return Number.isFinite(valor);
  }

  if (typeof valor === "string") {
    return REGEX_NUM.test(valor.trim());
  }

  return false;
};

const parseNumero = (valor: unknown): number => {
  if (typeof valor === "number") {
    return valor;
  }

  if (typeof valor === "string" && REGEX_NUM.test(valor.trim())) {
    return Number(valor);
  }

  return Number.NaN;
};

const inferirTipoPacote = (
  pacote: Record<string, unknown>,
  tipoEvento?: string,
): TipoPacoteTelemetria => {
  const tipoCampo = pacote.tipo;

  if (tipoCampo === "inicial" || tipoCampo === "movimentacao" || tipoCampo === "final") {
    return tipoCampo;
  }

  if (tipoEvento === "SESSAO_INICIADA") {
    return "inicial";
  }

  if (tipoEvento === "ATUALIZACAO_TELEMETRIA") {
    if ("sucesso" in pacote || "v_med" in pacote) {
      return "final";
    }

    if ("x" in pacote || "y" in pacote || "w" in pacote) {
      return "movimentacao";
    }
  }

  if ("dimensao" in pacote || "tentativa" in pacote) {
    return "inicial";
  }

  if ("sucesso" in pacote || "v_med" in pacote) {
    return "final";
  }

  if ("x" in pacote || "y" in pacote || "w" in pacote) {
    return "movimentacao";
  }

  return "desconhecido";
};

const validarPacoteFrontend = (
  pacote: unknown,
  tipo: TipoPacoteTelemetria,
  ultimoTimestampMs: number | null,
): ResultadoValidacao => {
  const erros: string[] = [];

  if (!isRegistro(pacote)) {
    return {
      valido: false,
      erros: ["payload invalido: pacote nao eh um objeto"],
    };
  }

  const idCorrida = pacote.id_corrida;
  const timestamp = pacote.timestamp_ms;

  if (!isInteiro(idCorrida)) {
    erros.push(`id_corrida invalido: recebido ${formatarValor(idCorrida)}`);
  }

  if (!isInteiro(timestamp)) {
    erros.push(`timestamp_ms invalido: recebido ${formatarValor(timestamp)}`);
  } else if (parseNumero(timestamp) < 0) {
    erros.push(`timestamp_ms negativo: recebido ${formatarValor(timestamp)}`);
  }

  if (tipo === "inicial") {
    const dimensao = pacote.dimensao;
    const tentativa = pacote.tentativa;
    const bateria = pacote.bateria;

    if (!REGEX_INT.test(String(dimensao).trim()) || !/^(4|8|16)$/.test(String(dimensao).trim())) {
      erros.push(`dimensao invalida: recebido ${formatarValor(dimensao)}`);
    }

    if (!REGEX_INT.test(String(tentativa).trim()) || !/^(1|2|3)$/.test(String(tentativa).trim())) {
      erros.push(`tentativa invalida: recebido ${formatarValor(tentativa)}`);
    }

    if (!isNumero(bateria)) {
      erros.push(`bateria invalida: recebido ${formatarValor(bateria)}`);
    } else {
      const bateriaNum = parseNumero(bateria);
      if (bateriaNum < 0 || bateriaNum > 100) {
        erros.push(`bateria fora do intervalo: recebido ${formatarValor(bateria)}`);
      }
    }
  }

  if (tipo === "movimentacao") {
    const x = pacote.x;
    const y = pacote.y;
    const w = pacote.w;

    if (!isNumero(x)) {
      erros.push(`x invalido: recebido ${formatarValor(x)}`);
    }

    if (!isNumero(y)) {
      erros.push(`y invalido: recebido ${formatarValor(y)}`);
    }

    if (!isNumero(w)) {
      erros.push(`w invalido: recebido ${formatarValor(w)}`);
    }

    if (isInteiro(timestamp) && ultimoTimestampMs !== null) {
      const timestampNum = parseNumero(timestamp);
      if (!Number.isNaN(timestampNum) && timestampNum < ultimoTimestampMs) {
        erros.push(
          `timestamp_ms regressivo: recebido ${formatarValor(timestamp)} < ${ultimoTimestampMs}`,
        );
      }
    }
  }

  if (tipo === "final") {
    const sucesso = pacote.sucesso;
    const vMed = pacote.v_med;
    const bateria = pacote.bateria;

    if (typeof sucesso !== "boolean") {
      erros.push(`sucesso invalido: recebido ${formatarValor(sucesso)}`);
    }

    if (!isNumero(vMed)) {
      erros.push(`v_med invalido: recebido ${formatarValor(vMed)}`);
    } else if (parseNumero(vMed) < 0) {
      erros.push(`v_med negativo: recebido ${formatarValor(vMed)}`);
    }

    if (!isNumero(bateria)) {
      erros.push(`bateria invalida: recebido ${formatarValor(bateria)}`);
    } else {
      const bateriaNum = parseNumero(bateria);
      if (bateriaNum < 0 || bateriaNum > 100) {
        erros.push(`bateria fora do intervalo: recebido ${formatarValor(bateria)}`);
      }
    }
  }

  if (tipo === "desconhecido") {
    erros.push("tipo_pacote invalido: campos insuficientes");
  }

  return { valido: erros.length === 0, erros };
};

export interface UseTelemetriaReturn {
  /** Estado atual dos indicadores de desempenho. */
  indicadores: IndicadoresDesempenho;
  /** Dados de configuração da sessão (recebidos uma única vez). */
  configSessao: ConfigSessao;
  /** Envia um pacote de telemetria via WebSocket. */
  enviarPacote: (pacote: PacoteTelemetria) => void;
  /** Indica se o WebSocket está conectado. */
  conectado: boolean;
  /** Última mensagem de erro, se houver. */
  erro: string | null;
  /** Indica se houve erro de validacao no ultimo pacote recebido. */
  alertaDadoInvalido: boolean;
  /** Lista de erros de validacao do ultimo pacote recebido. */
  errosValidacao: string[];
  /** Limpa alerta de dados invalidos. */
  limparErroValidacao: () => void;
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
  const [alertaDadoInvalido, setAlertaDadoInvalido] = useState(false);
  const [errosValidacao, setErrosValidacao] = useState<string[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indicadoresRef = useRef<IndicadoresDesempenho>(ESTADO_INICIAL);

  //Persistir estado no localStorage para manter dados entre recarregamentos
  useEffect(() => {
    localStorage.setItem("indicadores", JSON.stringify(indicadores));
    localStorage.setItem("configSessao", JSON.stringify(configSessao));
  }, [indicadores, configSessao]);

  useEffect(() => {
    indicadoresRef.current = indicadores;
  }, [indicadores]);

  const registrarErroValidacao = useCallback((erros: string[]) => {
    if (erros.length === 0) {
      return;
    }

    console.warn("[useTelemetria] Pacote descartado por falha na validacao:", erros);
    setErrosValidacao(erros);
    setAlertaDadoInvalido(true);
  }, []);

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
        const parsed = JSON.parse(event.data);
        const pacote = parsed?.data;

        if (!isRegistro(pacote)) {
          registrarErroValidacao([
            `payload invalido: pacote recebido ${formatarValor(pacote)}`,
          ]);
          return;
        }

        const tipoPacote = inferirTipoPacote(pacote, parsed?.type);
        const ultimoTimestampMs = indicadoresRef.current.ultimo_timestamp_ms;
        const resultado = validarPacoteFrontend(
          pacote,
          tipoPacote,
          ultimoTimestampMs,
        );

        if (!resultado.valido) {
          registrarErroValidacao(resultado.erros);
          return;
        }

        setAlertaDadoInvalido(false);
        setErrosValidacao([]);

        if (parsed.type === "SESSAO_INICIADA") {
          const { dimensao, tentativa, ...indicadoresData } = pacote;
          setIndicadores(indicadoresData as IndicadoresDesempenho);
          setConfigSessao({ dimensao, tentativa });
        } else if (parsed.type === "ATUALIZACAO_TELEMETRIA") {
          setIndicadores(pacote as IndicadoresDesempenho);
        }
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
      console.warn(
        "[useTelemetria] WebSocket não conectado, pacote descartado.",
      );
    }
  }, []);

  const limparErroValidacao = useCallback(() => {
    setErrosValidacao([]);
    setAlertaDadoInvalido(false);
  }, []);

  return {
    indicadores,
    configSessao,
    enviarPacote,
    conectado,
    erro,
    alertaDadoInvalido,
    errosValidacao,
    limparErroValidacao,
  };
}
