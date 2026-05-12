"""
Define a tabela de conexao entre celulas para desenhar o labirinto.
"""

from sqlalchemy import Column, ForeignKey, Integer
from sqlmodel import Field, SQLModel


class ConexaoCelula(SQLModel, table=True):
    __tablename__: str = "conexao_celula" #type: ignore

    id_celula1: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("celula.id_celula", ondelete="CASCADE"),
            primary_key=True,
        ),
    )
    id_celula2: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("celula.id_celula", ondelete="CASCADE"),
            primary_key=True,
        ),
    )
