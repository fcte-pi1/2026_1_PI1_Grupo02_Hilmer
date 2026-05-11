"""
Este módulo contém os Schemas Pydantic para Corrida.
A finalidade desses schemas é padronizar a estrutura dos dados enviados e recebidos através da API.

Os schemas são divididos em: 
- CorridaCreate: Pacote enviado pelo front-end ao final de uma sessão.
- CorridaResponse: Resumo de uma corrida para listagem / histórico.
- CorridaDetailResponse: Detalhes de uma corrida, incluindo percurso.
- PercursoResponse: Passo do percurso retornado na consulta.

"""

from datetime import datetime

from pydantic import BaseModel

from ..models.enums import StatusCorrida, TipoLabirinto


class CelulaCreate(BaseModel):
    """Célula do labirinto enviada pelo front-end."""

    coordenada_x: int
    coordenada_y: int
    parede_norte: bool
    parede_sul: bool
    parede_leste: bool
    parede_oeste: bool


class ConexaoCreate(BaseModel):
    """Conexão entre duas células."""

    indice_celula1: int
    indice_celula2: int


class PercursoCreate(BaseModel):
    """Passo do percurso."""

    indice_celula: int
    data_hora_passagem: datetime


class CorridaStart(BaseModel):
    """Dados para iniciar uma sessão de corrida."""

    tipo_labirinto: TipoLabirinto
    data_hora_inicio: datetime


class CorridaSave(BaseModel):
    """Pacote enviado pelo front-end ao final de uma sessão.

    Contém todos os dados necessários para persistir o resultado da corrida,
    as células, as conexões e o percurso de uma só vez.
    """

    # --- dados da corrida ---
    tempo_total: int
    tensao_media: float | None = None
    corrente_media: float | None = None
    velocidade_maxima_percurso: float | None = None
    velocidade_media: float | None = None
    status_corrida: StatusCorrida
    desafio_cumprido: bool
    data_hora_fim: datetime | None = None

    # --- células do labirinto ---
    celulas: list[CelulaCreate] = []

    # --- conexões entre células (índices na lista `celulas`) ---
    conexoes: list[ConexaoCreate] = []

    # --- percurso (índices na lista `celulas`) ---
    percurso: list[PercursoCreate] = []


# Respostas

class CorridaResponse(BaseModel):
    """Resumo de uma corrida para listagem / histórico."""

    id_corrida: int
    tempo_total: int | None
    tensao_media: float | None
    corrente_media: float | None
    velocidade_maxima_percurso: float | None
    velocidade_media: float | None
    status_corrida: StatusCorrida
    desafio_cumprido: bool | None
    data_hora_inicio: datetime | None
    data_hora_fim: datetime | None
    tipo_labirinto: TipoLabirinto | None = None

    model_config = {"from_attributes": True}


class CorridaDetailResponse(CorridaResponse):
    """Detalhes de uma corrida, incluindo percurso."""

    percurso: list["PercursoResponse"] = []


class PercursoResponse(BaseModel):
    """Passo do percurso retornado na consulta."""

    id_percurso: int
    id_celula: int | None
    data_hora_passagem: datetime | None

    model_config = {"from_attributes": True}
