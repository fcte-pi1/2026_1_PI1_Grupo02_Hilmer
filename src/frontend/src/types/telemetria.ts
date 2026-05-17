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
  id_corrida: number;
  timestamp_ms: number;
  dimensao: string;
  tentativa: number;
  bateria: number;
}

/** Pacote de movimentação durante a corrida. */
export interface PacoteMovimentacao {
  id_corrida: number;
  timestamp_ms: number;
  x: number;
  y: number;
  w: number;
  bateria?: number;
}

/** Pacote consolidado ao fim da corrida. */
export interface PacoteFinal {
  id_corrida: number;
  timestamp_ms: number;
  sucesso: boolean;
  v_med: number;
  bateria: number;
}

/** Union type de todos os pacotes de telemetria. */
export type PacoteTelemetria = PacoteInicial | PacoteMovimentacao | PacoteFinal;

// ---------------------------------------------------------------------------
// Estado dos indicadores
// ---------------------------------------------------------------------------

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
  alerta_dado_invalido: boolean;
}