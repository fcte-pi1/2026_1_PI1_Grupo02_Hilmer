"""
corrida.py
Define a tabela corrida e os relacionamentos entre corrida, labirinto e percurso.
"""
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Column, DateTime, ForeignKey, Identity, Integer
from sqlalchemy.dialects.postgresql import ENUM as PgENUM
from sqlmodel import Field, Relationship, SQLModel

from .enums import StatusCorrida

if TYPE_CHECKING:
    from .labirinto import Labirinto
    from .percurso import Percurso


class Corrida(SQLModel, table=True):
    """ fields:
    id_corrida:int,
    tempo_total:int,
    tensao_media:float,
    corrente_media:float,
    velocidade_maxima_percurso:float,
    velocidade_media:float,
    status_corrida:StatusCorrida,
    data_hora_inicio:datetime,
    data_hora_fim:datetime,
    id_labirinto:int,
    desafio_cumprido:bool,
    sessao_hardware_id:int,
    tentativa:int,
    bateria_inicial:int,
    bateria_final:int,
    """
    id_corrida: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer, Identity(always=False), primary_key=True
        ),
    )
    tempo_total: Optional[int] = None
    tensao_media: Optional[float] = None
    corrente_media: Optional[float] = None
    velocidade_maxima_percurso: Optional[float] = None
    velocidade_media: Optional[float] = None
    status_corrida: StatusCorrida = Field(
        default=StatusCorrida.EM_ANDAMENTO,
        sa_column=Column(
            PgENUM(
                StatusCorrida,
                name="enum_status_corrida",
                create_type=True,
                values_callable=lambda e: [member.value for member in e],
            ),
            nullable=False,
        ),
    )
    data_hora_inicio: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True)),
    )
    data_hora_fim: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True)),
    )
    id_labirinto: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer, ForeignKey("labirinto.id_labirinto")
        ),
    )
    desafio_cumprido: Optional[bool] = Field(
        default=False
    )
    sessao_hardware_id: Optional[int] = None
    tentativa: Optional[int] = None
    bateria_inicial: Optional[int] = None
    bateria_final: Optional[int] = None


    # --- relationships ---
    #utilizado para atualizar os objetos em tempo real, sem precisar explicitar consultas ao banco de dados
    labirinto: Optional["Labirinto"] = Relationship(
        back_populates="corridas"
    )
    percursos: list["Percurso"] = Relationship(
        back_populates="corrida"
    )
