"""
Schemas Pydantic para pacotes de telemetria e indicadores de desempenho.

Tipos de pacote (campo ``tipo`` — int):
  - 0 → PacoteInicial: configuração inicial da corrida.
  - 1 → PacoteMovimentacao: movimentação / descoberta de paredes.
  - 2 → PacoteRota: rota otimizada calculada pelo Floodfill.
  - 3 → PacoteFinal: dados consolidados ao fim da corrida.
  - 4 → PacoteHeartbeat: sinal periódico de vida da conexão.
  - 5 → PacoteAlertaTemperatura: alerta crítico de temperatura.

Schemas auxiliares:
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


class TipoPacote(int, enum.Enum):
    """Tipos de pacote de telemetria conforme telemetria.md.

    O campo ``tipo`` é o primeiro campo de todo pacote enviado pelo ESP32.
    """

    INICIAL = 0
    MOVIMENTACAO = 1
    ROTA = 2
    FINAL = 3
    HEARTBEAT = 4
    ALERTA_TEMPERATURA = 5
    INVALIDO = -1


class TipoAlertaTelemetria(str, enum.Enum):
    """Tipos de alertas críticos emitidos pelo monitoramento."""

    BATERIA_CRITICA = "bateria_critica"
    POSSIVEL_PARADA_INESPERADA = "possivel_parada_inesperada"
    TEMPERATURA_CRITICA = "temperatura_critica"


# ---------------------------------------------------------------------------
# Schemas de pacotes (validação de entrada)
# ---------------------------------------------------------------------------


class PacoteInicial(BaseModel):
    """Pacote de configuração inicial (tipo=0).

    Disparado uma única vez na largada.
    """

    tipo: int = Field(0)
    timestamp_ms: int = Field(ge=0)
    dimensao: int
    bateria: int = Field(ge=0, le=100)


class PacoteMovimentacao(BaseModel):
    """Pacote de movimentação / descoberta de paredes (tipo=1).

    Disparado apenas ao mudar de célula.
    """

    tipo: int = Field(1)
    timestamp_ms: int = Field(ge=0)
    x: int
    y: int
    w: int = Field(ge=0, le=15)


class PacoteRota(BaseModel):
    """Pacote contendo a rota otimizada calculada (tipo=2).

    Disparado uma única vez após o cálculo do Floodfill.
    """

    tipo: int = Field(2)
    timestamp_ms: int = Field(ge=0)
    rota: list[list[int]]

class PacoteFinal(BaseModel):
    """Pacote consolidado ao fim da corrida (tipo=3).

    Disparado uma única vez ao terminar/falhar.
    """

    tipo: int = Field(3)
    timestamp_ms: int = Field(ge=0)
    sucesso: bool
    v_med: float = Field(ge=0)
    bateria: int = Field(ge=0, le=100)


class PacoteHeartbeat(BaseModel):
    """Sinal periódico de vida da conexão (tipo=4).

    Enviado a cada 1,5 segundos. Permite detectar conexão perdida e
    monitorar nível de bateria ao longo da corrida.
    """

    tipo: int = Field(4)
    timestamp_ms: int = Field(ge=0)
    bateria: int = Field(ge=0, le=100)


class PacoteAlertaTemperatura(BaseModel):
    """Alerta crítico de temperatura (tipo=5).

    Enviado imediatamente quando a temperatura ultrapassa o limiar seguro.
    A corrida é interrompida automaticamente após este pacote.
    """

    tipo: int = Field(5)
    timestamp_ms: int = Field(ge=0)
    temp_c: float


class AlertaTelemetria(BaseModel):
    """Registro técnico de um alerta crítico detectado."""

    tipo: TipoAlertaTelemetria
    mensagem: str
    timestamp_ms: int = Field(ge=0)


# ---------------------------------------------------------------------------
# Estado dos indicadores
# ---------------------------------------------------------------------------


class IndicadoresDesempenho(BaseModel):
    """Estado consolidado dos indicadores de desempenho do dashboard."""

    id_corrida_banco: int | None = None
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
    alerta_possivel_parada_inesperada: bool = False
    alerta_dado_invalido: bool = False
    alerta_temperatura_critica: bool = False
    temperatura_atual: float | None = None
    log_alertas: list[AlertaTelemetria] = Field(default_factory=list)

    # --- Campos internos para cálculo acumulado de velocidade ---
    _distancia_total_cm: float = 0.0
    _tempo_total_movimento_s: float = 0.0
    _ultima_posicao_x: float | None = None
    _ultima_posicao_y: float | None = None
    _timestamp_inicio_parada_ms: int | None = None
    _alerta_bateria_critica_emitido: bool = False
    _alerta_parada_emitido: bool = False

    model_config = {"arbitrary_types_allowed": True}


# ---------------------------------------------------------------------------
# Resultado de validação
# ---------------------------------------------------------------------------


class ResultadoValidacao(BaseModel):
    """Resultado da validação de um pacote de telemetria."""

    valido: bool
    erros: list[str] = []
