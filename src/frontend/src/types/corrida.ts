export interface Corrida {
    id_corrida: number;
    tempo_total: number;
    tensao_media: number;
    corrente_media: number;
    velocidade_maxima_percurso: number;
    velocidade_media: number;
    status_corrida: string;
    desafio_cumprido: boolean;
    data_hora_inicio: string;
    data_hora_fim: string;
    tipo_labirinto: string;
}
