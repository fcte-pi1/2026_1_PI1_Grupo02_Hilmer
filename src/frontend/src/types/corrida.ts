export type TipoLabirinto = "4X4" | "8X8" | "16X16";
export type TipoLabirintoFiltro = TipoLabirinto | "TODOS";

export type StatusCorrida = "EM_ANDAMENTO" | "CONCLUIDA" | "ABORTADA";

export interface CelulaCreate {
  coordenada_x: number;
  coordenada_y: number;
  parede_norte: boolean;
  parede_sul: boolean;
  parede_leste: boolean;
  parede_oeste: boolean;
}

export interface ConexaoCreate {
  indice_celula1: number;
  indice_celula2: number;
}

export interface PercursoCreate {
  indice_celula: number;
  data_hora_passagem: string;
}

export interface CorridaStart {
  tipo_labirinto: TipoLabirinto;
  data_hora_inicio: string;
}

export interface CorridaSave {
  tempo_total: number;
  tensao_media: number | null;
  corrente_media: number | null;
  velocidade_maxima_percurso: number | null;
  velocidade_media: number | null;
  status_corrida: StatusCorrida;
  desafio_cumprido: boolean;
  data_hora_fim: string | null;
  celulas: CelulaCreate[];
  conexoes: ConexaoCreate[];
  percurso: PercursoCreate[];
}

export interface PercursoResponse {
  id_percurso: number;
  id_celula: number | null;
  data_hora_passagem: string | null;
  tipo_percurso: string;
}

export interface CorridaResponse {
  id_corrida: number;
  tempo_total: number | null;
  tensao_media: number | null;
  corrente_media: number | null;
  velocidade_maxima_percurso: number | null;
  velocidade_media: number | null;
  status_corrida: StatusCorrida;
  desafio_cumprido: boolean | null;
  data_hora_inicio: string | null;
  data_hora_fim: string | null;
  tipo_labirinto: TipoLabirinto | null;
}

export interface CorridaResumoResponse {
  id_corrida: number;
  data_hora_inicio: string | null;
  tempo_total: number | null;
  status_corrida: StatusCorrida;
  velocidade_media: number | null;
  tipo_labirinto: TipoLabirinto | null;
}

export interface CelulaResponse {
  id_celula: number;
  coordenada_x: number;
  coordenada_y: number;
  parede_norte: boolean;
  parede_sul: boolean;
  parede_leste: boolean;
  parede_oeste: boolean;
}

export interface CorridaDetailResponse extends CorridaResponse {
  celulas: CelulaResponse[];
  percurso: PercursoResponse[];
}

/** Resposta do endpoint GET /api/corridas/melhor-tempo?tipo=<tipo> */
export interface MelhorTempoResponse {
  id_corrida: number;
  tempo_total: number;
  data_hora_fim: string | null;
  tipo_labirinto: string | null;
}
