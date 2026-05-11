"""
celula.py
Define a tabela celula e os relacionamentos entre celula, labirinto e percurso.
"""

from typing import TYPE_CHECKING, Optional

from sqlalchemy import Column, ForeignKey, Identity, Integer
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .labirinto import Labirinto
    from .percurso import Percurso


class Celula(SQLModel, table=True):
    id_celula: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer, Identity(always=False), primary_key=True
        ),
    )
    coordenada_x: Optional[int] = None
    coordenada_y: Optional[int] = None
    parede_norte: Optional[bool] = None
    parede_sul: Optional[bool] = None
    parede_leste: Optional[bool] = None
    parede_oeste: Optional[bool] = None
    id_labirinto: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("labirinto.id_labirinto", ondelete="SET NULL"),
        ),
    )

    # --- relacionamentos entre tabelas ---
    #utilizado para atualizar os objetos em tempo real, sem precisar explicitar consultas ao banco de dados
    labirinto: Optional["Labirinto"] = Relationship(
        back_populates="celulas"
    )
    percursos: list["Percurso"] = Relationship(
        back_populates="celula"
    )