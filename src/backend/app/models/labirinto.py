"""Modelo Labirinto — tabela ``labirinto``."""

from typing import TYPE_CHECKING, Optional

from sqlalchemy import Column, Integer, Identity
from sqlalchemy.dialects.postgresql import ENUM as PgENUM
from sqlmodel import Field, Relationship, SQLModel

from .enums import TipoLabirinto

if TYPE_CHECKING:
    from .celula import Celula
    from .corrida import Corrida


class Labirinto(SQLModel, table=True):
    id_labirinto: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer, Identity(always=False), primary_key=True
        ),
    )
    tipo_labirinto: TipoLabirinto = Field(
        sa_column=Column(
            PgENUM(
                TipoLabirinto,
                name="enum_labirinto",
                create_type=True,
                values_callable=lambda e: [member.value for member in e],
            ),
            nullable=False,
        ),
    )

    # --- relacionamentos entre tabelas ---
    #util para atualizar os objetos em tempo real, sem precisar explicitar consultas ao banco de dados
    corridas: list["Corrida"] = Relationship(back_populates="labirinto")
    celulas: list["Celula"] = Relationship(back_populates="labirinto")
