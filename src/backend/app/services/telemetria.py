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
    AlertaTelemetria,
    IndicadoresDesempenho,
    ResultadoValidacao,
    StatusCorridaTelemetria,
    TipoAlertaTelemetria,
    TipoPacote,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constantes configuráveis
# ---------------------------------------------------------------------------

CELL_SIZE_CM: float = 18.0
"""Tamanho de cada célula do labirinto em centímetros (padrão Micromouse)."""

BATERIA_CRITICA_THRESHOLD: float = 10.0
"""Limiar percentual em que a bateria é considerada crítica."""

PARADA_INESPERADA_THRESHOLD_MS: int = 3000
"""Tempo mínimo em ms para considerar uma parada inesperada."""


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

    # Pacote de rota: rota (lista)
    if "rota" in packet and isinstance(packet["rota"], list):
        return TipoPacote.ROTA

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
    id_corrida = packet.get("id_corrida")
    if id_corrida is None:
        erros.append("Campo 'id_corrida' ausente.")
    elif not isinstance(id_corrida, int):
        erros.append(f"Campo 'id_corrida' deve ser um número inteiro (recebido: {id_corrida}).")

    ts = packet.get("timestamp_ms")
    if ts is None:
        erros.append("Campo 'timestamp_ms' ausente.")
    elif not isinstance(ts, int):
        erros.append(f"Campo 'timestamp_ms' deve ser um número inteiro (recebido: {ts}).")
    elif ts < 0:
        erros.append(f"Campo 'timestamp_ms' não pode ser negativo (recebido: {ts}).")

    # --- Validação por tipo ---
    if tipo == TipoPacote.INICIAL:
        _validar_pacote_inicial(packet, erros)
    elif tipo == TipoPacote.MOVIMENTACAO:
        _validar_pacote_movimentacao(packet, erros, ultimo_timestamp_ms)
    elif tipo == TipoPacote.ROTA:
        _validar_pacote_rota(packet, erros)
    elif tipo == TipoPacote.FINAL:
        _validar_pacote_final(packet, erros)

    return ResultadoValidacao(valido=len(erros) == 0, erros=erros)


def _validar_pacote_inicial(packet: dict, erros: list[str]) -> None:
    dimensao = packet.get("dimensao")
    if dimensao is None:
        erros.append("Campo 'dimensao' ausente no pacote inicial.")
    elif dimensao not in (4, 8, 16):
        erros.append(f"Dimensão inválida: deve ser 4, 8 ou 16 (recebido: {dimensao}).")

    tentativa = packet.get("tentativa")
    if tentativa is None:
        erros.append("Campo 'tentativa' ausente no pacote inicial.")
    elif tentativa not in (1, 2, 3):
        erros.append(f"Tentativa fora do limite: deve ser 1, 2 ou 3 (recebido: {tentativa}).")

    bateria = packet.get("bateria")
    if bateria is None:
        erros.append("Campo 'bateria' ausente no pacote inicial.")
    elif not isinstance(bateria, (int, float)):
        erros.append(f"Campo 'bateria' deve ser numérico (recebido: {bateria}).")
    elif not (0 <= bateria <= 100):
        erros.append(f"Bateria fora do range [0, 100] (recebido: {bateria}).")


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
            erros.append(f"Campo '{campo}' deve ser numérico (recebido: {valor}).")

    # Timestamp não-regressivo
    ts = packet.get("timestamp_ms")
    if (
        isinstance(ts, int)
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
            erros.append(f"Campo 'bateria' deve ser numérico (recebido: {bateria}).")
        elif not (0 <= bateria <= 100):
            erros.append(f"Bateria fora do range [0, 100] (recebido: {bateria}).")

def _validar_pacote_rota(packet: dict, erros: list[str]) -> None:
    """Valida as regras específicas do pacote de rota otimizada."""
    rota = packet.get("rota")
    if rota is None:
        erros.append("Campo 'rota' ausente.")
        return
        
    if not isinstance(rota, list):
        erros.append(f"Campo 'rota' deve ser uma lista (recebido: {type(rota)}).")
        return
        
    for i, pt in enumerate(rota):
        if not isinstance(pt, list) or len(pt) != 2:
            erros.append(f"Ponto {i} da rota inválido: deve ser [x, y] (recebido: {pt}).")
            continue
        if not isinstance(pt[0], (int, float)) or not isinstance(pt[1], (int, float)):
            erros.append(f"Coordenadas do ponto {i} devem ser numéricas (recebido: {pt}).")

def _validar_pacote_final(packet: dict, erros: list[str]) -> None:
    sucesso = packet.get("sucesso")
    if sucesso is None:
        erros.append("Campo 'sucesso' ausente no pacote final.")
    elif not isinstance(sucesso, bool):
        erros.append(f"Campo 'sucesso' deve ser booleano (recebido: {sucesso}).")

    v_med = packet.get("v_med")
    if v_med is None:
        erros.append("Campo 'v_med' ausente no pacote final.")
    elif not isinstance(v_med, (int, float)):
        erros.append(f"Campo 'v_med' deve ser numérico (recebido: {v_med}).")
    elif v_med < 0:
        erros.append(f"Campo 'v_med' não pode ser negativo (recebido: {v_med}).")

    bateria = packet.get("bateria")
    if bateria is None:
        erros.append("Campo 'bateria' ausente no pacote final.")
    elif not isinstance(bateria, (int, float)):
        erros.append(f"Campo 'bateria' deve ser numérico (recebido: {bateria}).")
    elif not (0 <= bateria <= 100):
        erros.append(f"Bateria fora do range [0, 100] (recebido: {bateria}).")



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
    novo_estado = estado_atual.model_copy(deep=True)

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
    _resetar_alerta_parada_inesperada(estado)
    _atualizar_alerta_bateria_critica(
        estado,
        bateria=estado.bateria_atual,
        timestamp_ms=pacote["timestamp_ms"],
    )


def _processar_pacote_movimentacao(
    estado: IndicadoresDesempenho, pacote: dict
) -> None:
    """Atualiza indicadores com dados do pacote de movimentação."""
    ts_atual = pacote["timestamp_ms"]
    x_atual = float(pacote["x"])
    y_atual = float(pacote["y"])
    velocidade_segmento: float | None = None

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
            velocidade_segmento = max(distancia_cm / delta_t_s, 0.0)

            estado._distancia_total_cm += distancia_cm
            estado._tempo_total_movimento_s += delta_t_s

            # Velocidade média acumulada
            if estado._tempo_total_movimento_s > 0:
                estado.velocidade_media = (
                    estado._distancia_total_cm / estado._tempo_total_movimento_s
                )

    _atualizar_alerta_parada_inesperada(
        estado,
        velocidade_segmento=velocidade_segmento,
        timestamp_ms=ts_atual,
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
        _atualizar_alerta_bateria_critica(
            estado,
            bateria=bateria,
            timestamp_ms=ts_atual,
        )


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
    _atualizar_alerta_bateria_critica(
        estado,
        bateria=pacote["bateria"],
        timestamp_ms=pacote["timestamp_ms"],
    )

    # Status e sucesso
    estado.sucesso = pacote["sucesso"]
    estado.status_corrida = (
        StatusCorridaTelemetria.CONCLUIDA
        if pacote["sucesso"]
        else StatusCorridaTelemetria.FALHA
    )
    _resetar_alerta_parada_inesperada(estado)


def _corrida_aceita_alerta_de_parada(estado: IndicadoresDesempenho) -> bool:
    """Indica se o estado atual representa uma sessão ativa."""
    return estado.status_corrida == StatusCorridaTelemetria.EM_ANDAMENTO


def _registrar_alerta(
    estado: IndicadoresDesempenho,
    tipo: TipoAlertaTelemetria,
    mensagem: str,
    timestamp_ms: int,
) -> None:
    """Adiciona um registro técnico de alerta ao histórico da sessão."""
    estado.log_alertas.append(
        AlertaTelemetria(
            tipo=tipo,
            mensagem=mensagem,
            timestamp_ms=timestamp_ms,
        )
    )


def _atualizar_alerta_bateria_critica(
    estado: IndicadoresDesempenho,
    bateria: float | None,
    timestamp_ms: int,
) -> None:
    """Liga ou desliga o alerta de bateria crítica e registra a transição."""
    if bateria is None:
        return

    bateria_critica = bateria <= BATERIA_CRITICA_THRESHOLD
    estado.alerta_bateria_critica = bateria_critica

    if bateria_critica and not estado._alerta_bateria_critica_emitido:
        _registrar_alerta(
            estado,
            tipo=TipoAlertaTelemetria.BATERIA_CRITICA,
            mensagem="Bateria crítica detectada.",
            timestamp_ms=timestamp_ms,
        )
        estado._alerta_bateria_critica_emitido = True
    elif not bateria_critica:
        estado._alerta_bateria_critica_emitido = False


def _resetar_alerta_parada_inesperada(estado: IndicadoresDesempenho) -> None:
    """Limpa o rastreamento da parada inesperada."""
    estado.alerta_possivel_parada_inesperada = False
    estado._timestamp_inicio_parada_ms = None
    estado._alerta_parada_emitido = False


def _atualizar_alerta_parada_inesperada(
    estado: IndicadoresDesempenho,
    velocidade_segmento: float | None,
    timestamp_ms: int,
) -> None:
    """Detecta velocidade zerada sustentada enquanto a sessão está ativa."""
    if not _corrida_aceita_alerta_de_parada(estado):
        _resetar_alerta_parada_inesperada(estado)
        return

    if velocidade_segmento is None:
        return

    if velocidade_segmento > 0:
        _resetar_alerta_parada_inesperada(estado)
        return

    if estado._timestamp_inicio_parada_ms is None:
        estado._timestamp_inicio_parada_ms = estado.ultimo_timestamp_ms

    if estado._timestamp_inicio_parada_ms is None:
        estado._timestamp_inicio_parada_ms = timestamp_ms

    tempo_parado_ms = timestamp_ms - estado._timestamp_inicio_parada_ms
    estado.alerta_possivel_parada_inesperada = (
        tempo_parado_ms > PARADA_INESPERADA_THRESHOLD_MS
    )

    if (
        estado.alerta_possivel_parada_inesperada
        and not estado._alerta_parada_emitido
    ):
        _registrar_alerta(
            estado,
            tipo=TipoAlertaTelemetria.POSSIVEL_PARADA_INESPERADA,
            mensagem="Possível parada inesperada detectada.",
            timestamp_ms=timestamp_ms,
        )
        estado._alerta_parada_emitido = True
