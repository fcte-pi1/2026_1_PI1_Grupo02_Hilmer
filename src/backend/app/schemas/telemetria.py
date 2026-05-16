"""
Schemas Pydantic para pacotes de telemetria e indicadores de desempenho.

Tipos de pacote:
  - PacoteInicial: dados de início/configuração da corrida.
  - PacoteMovimentacao: dados de movimentação durante a corrida.
  - PacoteFinal: dados consolidados ao fim da corrida.
  - IndicadoresDesempenho: estado consolidado dos indicadores do dashboard.
  - ResultadoValidacao: resultado da validação de um pacote.
"""

from __future__ import annotations

import enum

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class StatusCorridaTelemetria(str, enum.Enum):
    """Status possíveis da corrida no contexto de telemetria em tempo real."""

    AGUARDANDO = "aguardando"
    EM_ANDAMENTO = "em_andamento"
    CONCLUIDA = "concluida"
    FALHA = "falha"


class TipoPacote(str, enum.Enum):
    """Tipos de pacote de telemetria reconhecidos."""

    INICIAL = "inicial"
    MOVIMENTACAO = "movimentacao"
    FINAL = "final"
    INVALIDO = "invalido"


# ---------------------------------------------------------------------------
# Schemas de pacotes (validação de entrada)
# ---------------------------------------------------------------------------


class PacoteInicial(BaseModel):
    """Pacote de início/configuração da corrida."""

    id_corrida: int
    timestamp_ms: int = Field(ge=0)
    dimensao: str
    tentativa: int
    bateria: float = Field(ge=0, le=100)


class PacoteMovimentacao(BaseModel):
    """Pacote de movimentação durante a corrida."""

    id_corrida: int
    timestamp_ms: int = Field(ge=0)
    x: int | float
    y: int | float
    w: int | float
    bateria: float | None = Field(default=None, ge=0, le=100)


class PacoteFinal(BaseModel):
    """Pacote consolidado ao fim da corrida."""

    id_corrida: int
    timestamp_ms: int = Field(ge=0)
    sucesso: bool
    v_med: float = Field(ge=0)
    bateria: float = Field(ge=0, le=100)


# ---------------------------------------------------------------------------
# Estado dos indicadores
# ---------------------------------------------------------------------------


class IndicadoresDesempenho(BaseModel):
    """Estado consolidado dos indicadores de desempenho do dashboard."""

    id_corrida_banco: int | None = None
    sessao_hardware_id: int | None = None
    bateria_inicial: float | None = None
    bateria_atual: float | None = None
    bateria_final: float | None = None
    velocidade_media: float | None = None
    tempo_decorrido_ms: int = 0
    tempo_final_ms: int | None = None
    status_corrida: StatusCorridaTelemetria = StatusCorridaTelemetria.AGUARDANDO
    sucesso: bool | None = None
    ultimo_timestamp_ms: int | None = None
    alerta_bateria_critica: bool = False
    alerta_dado_invalido: bool = False

    # --- Campos internos para cálculo acumulado de velocidade ---
    _distancia_total_cm: float = 0.0
    _tempo_total_movimento_s: float = 0.0
    _ultima_posicao_x: float | None = None
    _ultima_posicao_y: float | None = None

    model_config = {"arbitrary_types_allowed": True}


# ---------------------------------------------------------------------------
# Resultado de validação
# ---------------------------------------------------------------------------


class ResultadoValidacao(BaseModel):
    """Resultado da validação de um pacote de telemetria."""

    valido: bool
    erros: list[str] = []
