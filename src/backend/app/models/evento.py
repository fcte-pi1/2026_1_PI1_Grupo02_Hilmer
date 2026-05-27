"""Modelo Evento — tabela ``evento``."""

from typing import TYPE_CHECKING, Optional

from sqlalchemy import Column, ForeignKey, Identity, Integer, String, Text
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .corrida import Corrida


class Evento(SQLModel, table=True):
    """Evento crítico persistido para consulta técnica posterior."""

    id_evento: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer, Identity(always=False), primary_key=True
        ),
    )
    tipo_evento: str = Field(
        sa_column=Column(String(length=100), nullable=False),
    )
    descricao: str = Field(
        sa_column=Column(Text, nullable=False),
    )
    timestamp_ms: int = Field(
        sa_column=Column(Integer, nullable=False),
    )
    id_corrida: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("corrida.id_corrida", ondelete="SET NULL"),
        ),
    )

    corrida: Optional["Corrida"] = Relationship(
        back_populates="eventos"
    )
