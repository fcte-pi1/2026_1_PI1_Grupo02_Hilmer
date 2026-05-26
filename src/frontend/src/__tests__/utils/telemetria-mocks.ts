import type { IndicadoresDesempenho } from "../../types/telemetria";

export const mockAguardando: IndicadoresDesempenho = {
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

export const mockEmAndamento: IndicadoresDesempenho = {
  id_corrida_banco: 1,
  sessao_hardware_id: 42,
  bateria_inicial: 100,
  bateria_atual: 72.5,
  bateria_final: null,
  velocidade_media: 35.87,
  tempo_decorrido_ms: 65430,
  tempo_final_ms: null,
  status_corrida: "em_andamento",
  sucesso: null,
  ultimo_timestamp_ms: Date.now(),
  alerta_bateria_critica: false,
  alerta_dado_invalido: false,
};

export const mockBateriaCritica: IndicadoresDesempenho = {
  ...mockEmAndamento,
  bateria_atual: 8,
  alerta_bateria_critica: true,
};

export const mockBateriaNormal: IndicadoresDesempenho = {
  ...mockEmAndamento,
  bateria_atual: 15,
  alerta_bateria_critica: false,
};

export const mockConcluida: IndicadoresDesempenho = {
  ...mockEmAndamento,
  bateria_atual: 61.0,
  bateria_final: 61.0,
  velocidade_media: 38.12,
  tempo_decorrido_ms: 93210,
  tempo_final_ms: 93210,
  status_corrida: "concluida",
  sucesso: true,
  ultimo_timestamp_ms: Date.now(),
};

export function criarIndicadores(
  overrides: Partial<IndicadoresDesempenho>,
): IndicadoresDesempenho {
  return { ...mockEmAndamento, ...overrides };
}