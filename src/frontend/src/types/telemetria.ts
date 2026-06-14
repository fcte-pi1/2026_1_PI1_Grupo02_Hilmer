/**
 * Tipos TypeScript para pacotes de telemetria e indicadores de desempenho.
 *
 * Espelha os schemas Pydantic do backend para garantir tipagem consistente.
 */

// ---------------------------------------------------------------------------
// Status da corrida
// ---------------------------------------------------------------------------

export type StatusCorridaTelemetria =
  | "aguardando"
  | "em_andamento"
  | "concluida"
  | "falha";

// ---------------------------------------------------------------------------
// Pacotes de telemetria
// ---------------------------------------------------------------------------

/** Pacote de início/configuração da corrida. */
export interface PacoteInicial {
  tipo: number;
  timestamp_ms: number;
  dimensao: number;
  bateria: number;
}

/** Pacote de movimentação durante a corrida. */
export interface PacoteMovimentacao {
  tipo: number;
  timestamp_ms: number;
  x: number;
  y: number;
  w: number;
}

/** Pacote contendo a rota otimizada calculada. */
export interface PacoteRota {
  tipo: number;
  timestamp_ms: number;
  rota: number[][];
}

/** Pacote consolidado ao fim da corrida. */
export interface PacoteFinal {
  tipo: number;
  timestamp_ms: number;
  sucesso: boolean;
  v_med: number;
  bateria: number;
}

/** Sinal periódico de vida da conexão. */
export interface PacoteHeartbeat {
  tipo: number;
  timestamp_ms: number;
  bateria: number;
}

/** Alerta crítico de temperatura. */
export interface PacoteAlertaTemperatura {
  tipo: number;
  timestamp_ms: number;
  temp_c: number;
}

/** Union type de todos os pacotes de telemetria. */
export type PacoteTelemetria = 
  | PacoteInicial 
  | PacoteMovimentacao 
  | PacoteRota
  | PacoteFinal
  | PacoteHeartbeat
  | PacoteAlertaTemperatura;

// ---------------------------------------------------------------------------
// Estado dos indicadores
// ---------------------------------------------------------------------------

/** Registro técnico de um alerta crítico detectado. */
export interface AlertaTelemetria {
  tipo: string;
  mensagem: string;
  timestamp_ms: number;
}

/** Estado consolidado dos indicadores de desempenho do dashboard. */
export interface IndicadoresDesempenho {
  id_corrida_banco: number | null;
  sessao_hardware_id: number | null;
  bateria_inicial: number | null;
  bateria_atual: number | null;
  bateria_final: number | null;
  velocidade_media: number | null;
  tempo_decorrido_ms: number;
  tempo_final_ms: number | null;
  status_corrida: StatusCorridaTelemetria;
  sucesso: boolean | null;
  ultimo_timestamp_ms: number | null;
  alerta_bateria_critica: boolean;
  alerta_possivel_parada_inesperada: boolean;
  alerta_dado_invalido: boolean;
  alerta_temperatura_critica: boolean;
  log_alertas: AlertaTelemetria[];
  temperatura_atual: number | null;

}

export interface ConfigSessao {
  dimensao: number | string | null;
}
