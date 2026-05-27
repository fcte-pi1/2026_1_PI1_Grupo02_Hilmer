"""Importa todos os modelos para que o SQLModel.metadata os registre."""

from app.models.celula import Celula
from app.models.conexao_celula import ConexaoCelula
from app.models.corrida import Corrida
from app.models.enums import StatusCorrida, TipoLabirinto
from app.models.evento import Evento
from app.models.labirinto import Labirinto
from app.models.percurso import Percurso

__all__ = [
    "Celula",
    "ConexaoCelula",
    "Corrida",
    "Evento",
    "Labirinto",
    "Percurso",
    "StatusCorrida",
    "TipoLabirinto",
]
