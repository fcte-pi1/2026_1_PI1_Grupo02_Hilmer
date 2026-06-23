export type EstadoDesafio =
  | "aguardando"
  | "em_andamento"
  | "concluida"
  | "falha";

export interface HistoricoEstado {
  tempo: string;
  estado: EstadoDesafio;
  descricao: string;
}