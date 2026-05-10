""" Definição de tipos ENUM para o labirinto e corrida a serem utilizados no PostgreSQL"""
import enum
class StatusCorrida(str, enum.Enum):
    """Status possíveis de uma corrida."""

    EM_ANDAMENTO = "EM ANDAMENTO"
    CONCLUIDA = "CONCLUIDA"
    ABORTADA = "ABORTADA"


class TipoLabirinto(str, enum.Enum):
    """Dimensões possíveis de labirinto."""

    QUATRO = "4X4"
    OITO = "8X8"
    DEZESSEIS = "16X16"
