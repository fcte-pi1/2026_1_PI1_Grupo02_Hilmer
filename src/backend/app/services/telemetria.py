"""Serviço de Telemetria — lógica pura dos indicadores de desempenho.

Responsabilidades:
  • Identificação do tipo de pacote de telemetria.
  • Validação dos campos obrigatórios e regras de negócio.
  • Cálculo de velocidade média acumulada.
  • Atualização do estado consolidado dos indicadores.

Todas as funções são puras (sem side-effects), recebem dados e
retornam novos objetos, sendo facilmente testáveis sem dependência
de banco de dados ou interface gráfica.
"""

from __future__ import annotations

import logging
import math

from ..schemas.telemetria import (
    IndicadoresDesempenho,
    ResultadoValidacao,
    StatusCorridaTelemetria,
    TipoPacote,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constantes configuráveis
# ---------------------------------------------------------------------------

CELL_SIZE_CM: float = 18.0
"""Tamanho de cada célula do labirinto em centímetros (padrão Micromouse)."""

BATERIA_CRITICA_THRESHOLD: float = 15.0
"""Limiar percentual abaixo do qual a bateria é considerada crítica."""


# ---------------------------------------------------------------------------
# Criação de estado inicial
# ---------------------------------------------------------------------------


def criar_estado_inicial() -> IndicadoresDesempenho:
    """Cria um estado zerado dos indicadores com status 'aguardando'."""
    return IndicadoresDesempenho()


# ---------------------------------------------------------------------------
# Identificação do tipo de pacote
# ---------------------------------------------------------------------------


def identificar_tipo_pacote(packet: dict | None) -> TipoPacote:
    """Identifica o tipo do pacote de telemetria com base nos campos presentes.

    Retorna:
        TipoPacote.INICIAL — possui ``dimensao``, ``tentativa`` e ``bateria``.
        TipoPacote.MOVIMENTACAO — possui ``x``, ``y`` e ``w``.
        TipoPacote.FINAL — possui ``sucesso``, ``v_med`` e ``bateria``.
        TipoPacote.INVALIDO — qualquer outro caso.
    """
    if not isinstance(packet, dict):
        return TipoPacote.INVALIDO

    # Pacote inicial: dimensao + tentativa + bateria (sem 'sucesso' para
    # desambiguar do pacote final que também tem bateria)
    if "dimensao" in packet and "tentativa" in packet and "bateria" in packet:
        return TipoPacote.INICIAL

    # Pacote final: sucesso + v_med + bateria
    if "sucesso" in packet and "v_med" in packet and "bateria" in packet:
        return TipoPacote.FINAL

    # Pacote de movimentação: x + y + w
    if "x" in packet and "y" in packet and "w" in packet:
        return TipoPacote.MOVIMENTACAO

    return TipoPacote.INVALIDO


# ---------------------------------------------------------------------------
# Validação de pacotes
# ---------------------------------------------------------------------------


def validar_pacote(
    packet: dict,
    tipo: TipoPacote,
    ultimo_timestamp_ms: int | None = None,
) -> ResultadoValidacao:
    """Valida um pacote de telemetria conforme seu tipo.

    Args:
        packet: dicionário com os dados do pacote.
        tipo: tipo identificado do pacote.
        ultimo_timestamp_ms: último timestamp válido recebido na corrida.

    Returns:
        ResultadoValidacao com flag ``valido`` e lista de ``erros``.
    """
    erros: list[str] = []

    if tipo == TipoPacote.INVALIDO:
        erros.append("Tipo de pacote não reconhecido.")
        return ResultadoValidacao(valido=False, erros=erros)

    # --- Campos obrigatórios gerais ---
    if "id_corrida" not in packet:
        erros.append("Campo 'id_corrida' ausente.")

    ts = packet.get("timestamp_ms")
    if ts is None:
        erros.append("Campo 'timestamp_ms' ausente.")
    elif not isinstance(ts, (int, float)):
        erros.append("Campo 'timestamp_ms' deve ser numérico.")
    elif ts < 0:
        erros.append("Campo 'timestamp_ms' não pode ser negativo.")

    # --- Validação por tipo ---
    if tipo == TipoPacote.INICIAL:
        _validar_pacote_inicial(packet, erros)
    elif tipo == TipoPacote.MOVIMENTACAO:
        _validar_pacote_movimentacao(packet, erros, ultimo_timestamp_ms)
    elif tipo == TipoPacote.FINAL:
        _validar_pacote_final(packet, erros)

    return ResultadoValidacao(valido=len(erros) == 0, erros=erros)


def _validar_pacote_inicial(packet: dict, erros: list[str]) -> None:
    if "dimensao" not in packet:
        erros.append("Campo 'dimensao' ausente no pacote inicial.")
    if "tentativa" not in packet:
        erros.append("Campo 'tentativa' ausente no pacote inicial.")

    bateria = packet.get("bateria")
    if bateria is None:
        erros.append("Campo 'bateria' ausente no pacote inicial.")
    elif not isinstance(bateria, (int, float)):
        erros.append("Campo 'bateria' deve ser numérico.")
    elif not (0 <= bateria <= 100):
        erros.append("Campo 'bateria' deve estar entre 0 e 100.")


def _validar_pacote_movimentacao(
    packet: dict,
    erros: list[str],
    ultimo_timestamp_ms: int | None,
) -> None:
    for campo in ("x", "y", "w"):
        valor = packet.get(campo)
        if valor is None:
            erros.append(f"Campo '{campo}' ausente no pacote de movimentação.")
        elif not isinstance(valor, (int, float)):
            erros.append(f"Campo '{campo}' deve ser numérico.")

    # Timestamp não-regressivo
    ts = packet.get("timestamp_ms")
    if (
        isinstance(ts, (int, float))
        and ultimo_timestamp_ms is not None
        and ts < ultimo_timestamp_ms
    ):
        erros.append(
            f"Timestamp regressivo: {ts} < último válido {ultimo_timestamp_ms}."
        )

    # Bateria opcional — se presente, validar range
    bateria = packet.get("bateria")
    if bateria is not None:
        if not isinstance(bateria, (int, float)):
            erros.append("Campo 'bateria' deve ser numérico.")
        elif not (0 <= bateria <= 100):
            erros.append("Campo 'bateria' deve estar entre 0 e 100.")


def _validar_pacote_final(packet: dict, erros: list[str]) -> None:
    sucesso = packet.get("sucesso")
    if sucesso is None:
        erros.append("Campo 'sucesso' ausente no pacote final.")
    elif not isinstance(sucesso, bool):
        erros.append("Campo 'sucesso' deve ser booleano.")

    v_med = packet.get("v_med")
    if v_med is None:
        erros.append("Campo 'v_med' ausente no pacote final.")
    elif not isinstance(v_med, (int, float)):
        erros.append("Campo 'v_med' deve ser numérico.")
    elif v_med < 0:
        erros.append("Campo 'v_med' não pode ser negativo.")

    bateria = packet.get("bateria")
    if bateria is None:
        erros.append("Campo 'bateria' ausente no pacote final.")
    elif not isinstance(bateria, (int, float)):
        erros.append("Campo 'bateria' deve ser numérico.")
    elif not (0 <= bateria <= 100):
        erros.append("Campo 'bateria' deve estar entre 0 e 100.")


# ---------------------------------------------------------------------------
# Cálculo de velocidade de um segmento
# ---------------------------------------------------------------------------


def calcular_velocidade_segmento(
    x1: float,
    y1: float,
    t1_ms: int,
    x2: float,
    y2: float,
    t2_ms: int,
) -> float | None:
    """Calcula a velocidade (cm/s) entre dois pontos do percurso.

    Args:
        x1, y1: posição anterior (em células).
        t1_ms: timestamp anterior (ms).
        x2, y2: posição atual (em células).
        t2_ms: timestamp atual (ms).

    Returns:
        Velocidade em cm/s, ou ``None`` se deltaT ≤ 0.
    """
    delta_t_s = (t2_ms - t1_ms) / 1000.0
    if delta_t_s <= 0:
        return None

    distancia_celulas = math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
    distancia_cm = distancia_celulas * CELL_SIZE_CM
    velocidade = distancia_cm / delta_t_s

    return max(velocidade, 0.0)


# ---------------------------------------------------------------------------
# Função agregadora principal
# ---------------------------------------------------------------------------


def atualizar_indicadores(
    estado_atual: IndicadoresDesempenho,
    pacote: dict | None,
) -> IndicadoresDesempenho:
    """Recebe o estado atual e um novo pacote, retornando o estado atualizado.

    Esta é a função principal que orquestra:
    1. Identificação do tipo de pacote.
    2. Validação.
    3. Atualização dos indicadores conforme o tipo.
    4. Preservação do estado anterior em caso de pacote inválido.

    Args:
        estado_atual: estado corrente dos indicadores.
        pacote: dicionário com dados do pacote de telemetria.

    Returns:
        Novo IndicadoresDesempenho com os valores atualizados.
    """
    # Cópia do estado (para não mutar o original)
    novo_estado = estado_atual.model_copy()

    # Limpar alerta de dado inválido do ciclo anterior
    novo_estado.alerta_dado_invalido = False

    # 1. Identificar tipo
    tipo = identificar_tipo_pacote(pacote)

    # 2. Validar
    resultado = validar_pacote(
        pacote if isinstance(pacote, dict) else {},
        tipo,
        estado_atual.ultimo_timestamp_ms,
    )

    if not resultado.valido:
        logger.warning("Pacote inválido recebido: %s", resultado.erros)
        novo_estado.alerta_dado_invalido = True
        return novo_estado

    # A partir daqui, pacote é dict válido — type assertion segura
    assert isinstance(pacote, dict)

    # 3. Atualizar conforme tipo
    if tipo == TipoPacote.INICIAL:
        _processar_pacote_inicial(novo_estado, pacote)
    elif tipo == TipoPacote.MOVIMENTACAO:
        _processar_pacote_movimentacao(novo_estado, pacote)
    elif tipo == TipoPacote.FINAL:
        _processar_pacote_final(novo_estado, pacote)

    return novo_estado


# ---------------------------------------------------------------------------
# Processamento por tipo de pacote
# ---------------------------------------------------------------------------


def _processar_pacote_inicial(
    estado: IndicadoresDesempenho, pacote: dict
) -> None:
    """Atualiza indicadores com dados do pacote inicial."""
    estado.sessao_hardware_id = pacote["id_corrida"]
    estado.bateria_inicial = pacote["bateria"]
    estado.bateria_atual = pacote["bateria"]
    estado.alerta_bateria_critica = pacote["bateria"] < BATERIA_CRITICA_THRESHOLD
    estado.status_corrida = StatusCorridaTelemetria.EM_ANDAMENTO
    estado.tempo_decorrido_ms = 0
    estado.tempo_final_ms = None
    estado.velocidade_media = None
    estado.sucesso = None
    estado.ultimo_timestamp_ms = pacote["timestamp_ms"]

    # Resetar acumuladores internos
    estado._distancia_total_cm = 0.0
    estado._tempo_total_movimento_s = 0.0
    estado._ultima_posicao_x = None
    estado._ultima_posicao_y = None


def _processar_pacote_movimentacao(
    estado: IndicadoresDesempenho, pacote: dict
) -> None:
    """Atualiza indicadores com dados do pacote de movimentação."""
    ts_atual = pacote["timestamp_ms"]
    x_atual = float(pacote["x"])
    y_atual = float(pacote["y"])

    # Calcular deslocamento e velocidade ANTES de atualizar posição/timestamp
    if (
        estado._ultima_posicao_x is not None
        and estado._ultima_posicao_y is not None
        and estado.ultimo_timestamp_ms is not None
    ):
        delta_t_s = (ts_atual - estado.ultimo_timestamp_ms) / 1000.0
        if delta_t_s > 0:
            distancia_celulas = math.sqrt(
                (x_atual - estado._ultima_posicao_x) ** 2
                + (y_atual - estado._ultima_posicao_y) ** 2
            )
            distancia_cm = distancia_celulas * CELL_SIZE_CM

            estado._distancia_total_cm += distancia_cm
            estado._tempo_total_movimento_s += delta_t_s

            # Velocidade média acumulada
            if estado._tempo_total_movimento_s > 0:
                estado.velocidade_media = (
                    estado._distancia_total_cm / estado._tempo_total_movimento_s
                )

    # Atualizar posição e timestamp
    estado._ultima_posicao_x = x_atual
    estado._ultima_posicao_y = y_atual
    estado.tempo_decorrido_ms = ts_atual
    estado.ultimo_timestamp_ms = ts_atual

    # Atualizar bateria se presente
    bateria = pacote.get("bateria")
    if bateria is not None and isinstance(bateria, (int, float)) and 0 <= bateria <= 100:
        estado.bateria_atual = bateria
        estado.alerta_bateria_critica = bateria < BATERIA_CRITICA_THRESHOLD


def _processar_pacote_final(
    estado: IndicadoresDesempenho, pacote: dict
) -> None:
    """Atualiza indicadores com dados do pacote final."""
    estado.tempo_final_ms = pacote["timestamp_ms"]
    estado.tempo_decorrido_ms = pacote["timestamp_ms"]
    estado.ultimo_timestamp_ms = pacote["timestamp_ms"]

    # Velocidade média final consolidada (do firmware)
    estado.velocidade_media = pacote["v_med"]

    # Bateria final
    estado.bateria_atual = pacote["bateria"]
    estado.bateria_final = pacote["bateria"]
    estado.alerta_bateria_critica = pacote["bateria"] < BATERIA_CRITICA_THRESHOLD

    # Status e sucesso
    estado.sucesso = pacote["sucesso"]
    estado.status_corrida = (
        StatusCorridaTelemetria.CONCLUIDA
        if pacote["sucesso"]
        else StatusCorridaTelemetria.FALHA
    )
