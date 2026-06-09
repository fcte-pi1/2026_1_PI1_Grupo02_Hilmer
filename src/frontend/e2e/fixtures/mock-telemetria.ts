/**
 * Fixtures de telemetria do Sistema Web Micromouse
 * Baseados nos pacotes definidos na documentação do projeto (Tabela 20)
 * Rastreabilidade: HU-20 (Comunicação), HU-10 (Validação)
 */

export const pacoteInicial = {
  tipo: 'inicio',
  id_corrida: '8x8_001',
  timestamp_ms: 0,
  dimensao: 8,
  tentativa: 1,
  bateria: 100,
};

export const pacoteMovimentacao = {
  tipo: 'movimento',
  id_corrida: '8x8_001',
  timestamp_ms: 1234,
  x: 2,
  y: 1,
  direcao: 'N',
  w: 5,
  bateria: 98.5,
};

export const pacoteFinal = {
  tipo: 'fim',
  id_corrida: '8x8_001',
  timestamp_ms: 14250,
  sucesso: true,
  v_med: 22.0,
  bateria: 88,
};

export const heartbeat = {
  tipo: 'heartbeat',
  id_corrida: '8x8_001',
  timestamp_ms: 15000,
  bateria: 87,
};

export const pacoteInvalido = {
  tipo: 'movimento',
  // id_corrida ausente — campo obrigatório
  timestamp_ms: 999,
  x: 'invalido', // tipo errado
};

export const eventoSessaoIniciada = {
  type: 'SESSAO_INICIADA',
  data: {
    id_corrida: '8x8_001',
    dimensao: 8,
    tentativa: 1,
    bateria: 100,
  },
};

export const eventoAtualizacaoTelemetria = {
  type: 'ATUALIZACAO_TELEMETRIA',
  data: {
    id_corrida: '8x8_001',
    x: 2,
    y: 1,
    direcao: 'N',
    bateria: 98.5,
    timestamp_ms: 1234,
  },
};

export const eventoConexaoPerdida = {
  type: 'CONEXAO_PERDIDA',
};