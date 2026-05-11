"""Modelo Percurso — tabela ``percurso``."""

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Column, DateTime, ForeignKey, Identity, Integer
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .celula import Celula
    from .corrida import Corrida


class Percurso(SQLModel, table=True):
    id_percurso: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer, Identity(always=False), primary_key=True
        ),
    )
    id_celula: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("celula.id_celula", ondelete="SET NULL"),
        ),
    )
    id_corrida: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("corrida.id_corrida", ondelete="SET NULL"),
        ),
    )
    data_hora_passagem: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True)),
    )

    # --- relationships ---
    #utilizado para atualizar os objetos em tempo real, sem precisar explicitar consultas ao banco de dados
    celula: Optional["Celula"] = Relationship(
        back_populates="percursos"
    )
    corrida: Optional["Corrida"] = Relationship(
        back_populates="percursos"
    )
