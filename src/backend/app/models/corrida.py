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
    desafio_cumprido: Optional[bool] = None

    # --- relationships ---
    #utilizado para atualizar os objetos em tempo real, sem precisar explicitar consultas ao banco de dados
    labirinto: Optional["Labirinto"] = Relationship(
        back_populates="corridas"
    )
    percursos: list["Percurso"] = Relationship(
        back_populates="corrida"
    )
