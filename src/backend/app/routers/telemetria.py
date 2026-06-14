from datetime import datetime, UTC
from typing import Dict, Any
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..services.telemetria import (
    atualizar_indicadores,
    criar_estado_inicial,
    identificar_tipo_pacote,
    validar_pacote,
)
from ..schemas.telemetria import IndicadoresDesempenho, TipoPacote
from ..services.websocket_manager import manager
from ..services.connection_monitor import connection_monitor
from ..models.celula import Celula
from ..models.corrida import Corrida
from ..models.evento import Evento
from ..models.labirinto import Labirinto
from ..models.percurso import Percurso
from ..models.enums import StatusCorrida, TipoLabirinto

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/telemetria", tags=["telemetria"])

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------
_DIMENSAO_PARA_TIPO_LABIRINTO: dict[int, TipoLabirinto] = {
    4: TipoLabirinto.QUATRO,
    8: TipoLabirinto.OITO,
    16: TipoLabirinto.DEZESSEIS,
}

# ---------------------------------------------------------------------------
# Estado em memória — corrida única ativa
# ---------------------------------------------------------------------------
_id_corrida_atual: int | None = None
_estado_atual: IndicadoresDesempenho | None = None


def _get_id_corrida_atual() -> int | None:
    return _id_corrida_atual


def _set_corrida_atual(
    id_corrida: int | None,
    estado: IndicadoresDesempenho | None,
) -> None:
    global _id_corrida_atual, _estado_atual
    _id_corrida_atual = id_corrida
    _estado_atual = estado


@router.websocket("/ws")
async def websocket_telemetria(websocket: WebSocket):
    """
    Endpoint de WebSocket para o dashboard.
    O front-end se conecta aqui para ouvir eventos em tempo real.
    """
    await manager.connect(websocket)
    handshake = {
        "type": "HANDSHAKE",
        "data": {
            "status": "connected",
            "server_time": datetime.now(UTC).isoformat(),
            "version": "0.1.0",
        }
    }
    await manager.send_json_to_client(handshake, websocket)

    # Enviar status da corrida ativa (se houver) para o novo cliente
    id_corrida = _id_corrida_atual
    if id_corrida is not None:
        status = connection_monitor.get_status(id_corrida) or "online"
        await manager.send_json_to_client({
            "type": "CONNECTION_STATUS",
            "data": {
                "id_corrida": id_corrida,
                "status": status,
                "message": "Status recuperado ao conectar"
            }
        }, websocket)

    try:
        while True:
            await websocket.receive_json()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@router.post("/pacote", status_code=201)
async def receber_pacote_telemetria(
    payload: Dict[str, Any],
    session: Session = Depends(get_session)
):
    """
    Endpoint HTTP para o Micromouse enviar pacotes de telemetria.
    Recebe o pacote, atualiza o estado em memória e notifica o Dashboard.

    O ESP32 não envia ``id_corrida``; o backend gerencia uma corrida
    única ativa por vez, mantendo o ``id_corrida`` real do banco em memória.
    """
    pacote = payload
    tipo = identificar_tipo_pacote(pacote)

    # --- Validação inicial ---
    # Determinar último timestamp para validar regressão
    ultimo_ts = None
    if _estado_atual is not None:
        ultimo_ts = _estado_atual.ultimo_timestamp_ms
    # Pacote inicial reseta o timestamp
    if tipo == TipoPacote.INICIAL:
        ultimo_ts = None

    resultado = validar_pacote(pacote, tipo, ultimo_ts)
    if not resultado.valido:
        erros_str = ", ".join(resultado.erros)
        logger.warning(
            "Pacote REJEITADO por falha na validação: %s", erros_str)

        await manager.send_json_to_all_clients({
            "type": "ERROR",
            "message": f"Dados inválidos do robô: {erros_str}"
        })

        raise HTTPException(
            status_code=422,
            detail={"mensagem": "Pacote descartado", "erros": resultado.erros},
        )

    # --- Gerenciamento de corrida ---
    commit_realizado = False
    tipo_lab = None

    if tipo == TipoPacote.INICIAL:
        # 1. Abortar corridas ativas no banco (resiliência a reinício)
        await _abortar_corridas_no_banco(session)

        # 2. Limpar estado em memória anterior (se houver)
        if _id_corrida_atual is not None:
            connection_monitor.remover_corrida(_id_corrida_atual)

        # 3. Criar estado inicial e processar indicadores
        estado_anterior = criar_estado_inicial()
        novo_estado = atualizar_indicadores(estado_anterior, pacote)

        # 4. Resolver dimensão e persistir labirinto + corrida no banco
        tipo_lab = _DIMENSAO_PARA_TIPO_LABIRINTO.get(int(pacote.get("dimensao")))

        labirinto = Labirinto(tipo_labirinto=tipo_lab)
        session.add(labirinto)
        session.flush()

        corrida = Corrida(
            data_hora_inicio=datetime.now(UTC),
            id_labirinto=labirinto.id_labirinto,
            status_corrida=StatusCorrida.EM_ANDAMENTO,
            bateria_inicial=pacote.get("bateria", 100),
        )
        session.add(corrida)
        session.flush()

        novo_estado.id_corrida_banco = corrida.id_corrida
        _persistir_novos_alertas(session, estado_anterior, novo_estado)
        session.commit()
        session.refresh(corrida)
        commit_realizado = True

        # 5. Salvar id_corrida em memória e registrar no monitor
        _set_corrida_atual(corrida.id_corrida, novo_estado)
        await connection_monitor.registrar_pacote(corrida.id_corrida)
    # Se não for pacote inicial
    else:
        # Para pacotes não-iniciais, deve existir uma corrida ativa.
        # Se o servidor reiniciou, recuperar a corrida ativa do banco.
        if _id_corrida_atual is None or _estado_atual is None:
            corrida_recuperada = _recuperar_corrida_ativa(session)
            if corrida_recuperada is None:
                raise HTTPException(
                    status_code=409,
                    detail={
                        "mensagem": "Nenhuma corrida ativa. Envie um pacote inicial (tipo=0) primeiro."},
                )
            # Restaurar estado em memória a partir da corrida do banco
            estado_recuperado = criar_estado_inicial()
            estado_recuperado.id_corrida_banco = corrida_recuperada.id_corrida
            estado_recuperado.bateria_inicial = corrida_recuperada.bateria_inicial
            _set_corrida_atual(corrida_recuperada.id_corrida, estado_recuperado)
            await connection_monitor.registrar_pacote(corrida_recuperada.id_corrida)
            logger.info(
                "Corrida %d recuperada do banco após reinício do servidor.",
                corrida_recuperada.id_corrida,
            )

        await connection_monitor.registrar_pacote(_id_corrida_atual)

        estado_anterior = _estado_atual
        novo_estado = atualizar_indicadores(estado_anterior, pacote)

    # --- Persistência por tipo de pacote ---
    if tipo == TipoPacote.MOVIMENTACAO and novo_estado.id_corrida_banco is not None:
        x = pacote.get("x")
        y = pacote.get("y")
        if x is not None and y is not None:
            _persistir_passo_percurso(
                session,
                id_corrida=novo_estado.id_corrida_banco,
                x=float(x),
                y=float(y),
                tipo_percurso="exploratorio",
            )
            if not commit_realizado:
                _persistir_novos_alertas(session, estado_anterior, novo_estado)
                session.commit()
                commit_realizado = True

    elif tipo == TipoPacote.ROTA and novo_estado.id_corrida_banco is not None:
        rota = pacote.get("rota")
        if rota is not None and isinstance(rota, list):
            for pt in rota:
                if isinstance(pt, list) and len(pt) == 2:
                    _persistir_passo_percurso(
                        session,
                        id_corrida=novo_estado.id_corrida_banco,
                        x=float(pt[0]),
                        y=float(pt[1]),
                        tipo_percurso="otimizado",
                    )
            if not commit_realizado:
                _persistir_novos_alertas(session, estado_anterior, novo_estado)
                session.commit()
                commit_realizado = True

    elif tipo == TipoPacote.FINAL and novo_estado.id_corrida_banco is not None:
        corrida = session.get(Corrida, novo_estado.id_corrida_banco)
        if corrida:
            corrida.status_corrida = StatusCorrida.CONCLUIDA
            corrida.data_hora_fim = datetime.now(UTC)
            corrida.bateria_final = novo_estado.bateria_final
            corrida.velocidade_media = novo_estado.velocidade_media
            corrida.tempo_total = novo_estado.tempo_final_ms
            corrida.desafio_cumprido = novo_estado.sucesso
            session.add(corrida)
            _persistir_novos_alertas(session, estado_anterior, novo_estado)
            session.commit()
            commit_realizado = True

    elif tipo == TipoPacote.HEARTBEAT and novo_estado.id_corrida_banco is not None:
        if not commit_realizado and _persistir_novos_alertas(session, estado_anterior, novo_estado):
            session.commit()
            commit_realizado = True

    elif tipo == TipoPacote.ALERTA_TEMPERATURA and novo_estado.id_corrida_banco is not None:
        novo_estado.temperatura_atual = pacote.get("temp_c")
        corrida = session.get(Corrida, novo_estado.id_corrida_banco)
        if corrida and corrida.status_corrida == StatusCorrida.EM_ANDAMENTO:
            corrida.status_corrida = StatusCorrida.ABORTADA
            corrida.data_hora_fim = datetime.now(UTC)
            corrida.bateria_final = novo_estado.bateria_atual
            corrida.tempo_total = novo_estado.tempo_final_ms
            session.add(corrida)
            _persistir_novos_alertas(session, estado_anterior, novo_estado)
            session.commit()
            commit_realizado = True

    if not commit_realizado and _persistir_novos_alertas(session, estado_anterior, novo_estado):
        session.commit()

    # Salva o novo estado na memória
    _set_corrida_atual(_id_corrida_atual, novo_estado)

    # --- Broadcast para o Dashboard via WebSocket ---
    estado_dict = _estado_to_dict(novo_estado)
    if tipo == TipoPacote.INICIAL:
        evento = {
            "type": "SESSAO_INICIADA",
            "data": {
                **estado_dict,
                "dimensao": tipo_lab.value if tipo_lab else None,
            }
        }
    elif tipo == TipoPacote.HEARTBEAT:
        evento = {
            "type": "HEARTBEAT",
            "data": estado_dict
        }
    elif tipo == TipoPacote.ALERTA_TEMPERATURA:
        evento = {
            "type": "ALERTA_TEMPERATURA_CRITICA",
            "data": {
                **estado_dict,
                "temp_c": pacote.get("temp_c"),
            }
        }
    else:
        evento = {
            "type": "ATUALIZACAO_TELEMETRIA",
            "data": estado_dict
        }
    if tipo == TipoPacote.MOVIMENTACAO:
        evento_movimentacao = {
            "type": "MOVIMENTACAO",
            "data": {
                "id_corrida": novo_estado.id_corrida_banco,
                "timestamp_ms": pacote.get("timestamp_ms"),
                "x": pacote.get("x"),
                "y": pacote.get("y"),
                "w": pacote.get("w"),
            },
        }
        await manager.send_json_to_all_clients(evento_movimentacao)

    await manager.send_json_to_all_clients(evento)
    if tipo in (TipoPacote.FINAL, TipoPacote.ALERTA_TEMPERATURA):
        id_corrida_encerrada = _id_corrida_atual
        connection_monitor.remover_corrida(id_corrida_encerrada)
        _set_corrida_atual(None, None)
    return {"message": "Pacote processado com sucesso", "estado": estado_dict}


async def _abortar_corridas_no_banco(session: Session) -> list[int]:
    """Consulta o banco e aborta todas as corridas EM_ANDAMENTO.

    Chamada ao receber um pacote inicial para garantir que não existam
    corridas órfãs (ex.: após reinício do servidor).

    Retorna a lista de id_corrida abortados.
    """
    corridas = session.exec(
        select(Corrida).where(Corrida.status_corrida == StatusCorrida.EM_ANDAMENTO)
    ).all()

    ids_abortados = []
    for corrida in corridas:
        corrida.status_corrida = StatusCorrida.ABORTADA
        corrida.data_hora_fim = datetime.now(UTC)
        session.add(corrida)
        ids_abortados.append(corrida.id_corrida)

    if ids_abortados:
        session.commit()
        for id_abortado in ids_abortados:
            await manager.send_json_to_all_clients({
                "type": "SESSAO_ENCERRADA",
                "data": {
                    "sessao_encerrada": id_abortado,
                    "motivo": "Nova sessão iniciada pelo Micromouse",
                }
            })
        logger.info(
            "Corridas abortadas ao receber pacote inicial: %s", ids_abortados
        )

    return ids_abortados


def _recuperar_corrida_ativa(session: Session) -> Corrida | None:
    """Recupera a corrida EM_ANDAMENTO do banco, se existir.

    Usada para restaurar o estado em memória após reinício do servidor
    enquanto uma corrida ainda está em andamento no hardware.

    Retorna a Corrida ou None se não houver corrida ativa.
    """
    return session.exec(
        select(Corrida).where(Corrida.status_corrida == StatusCorrida.EM_ANDAMENTO)
    ).first()

def _estado_to_dict(estado: IndicadoresDesempenho) -> dict:
    """Converte o estado dos indicadores para dicionário serializável."""
    return {
        "id_corrida_banco": estado.id_corrida_banco,
        "bateria_inicial": estado.bateria_inicial,
        "bateria_atual": estado.bateria_atual,
        "bateria_final": estado.bateria_final,
        "velocidade_media": estado.velocidade_media,
        "tempo_decorrido_ms": estado.tempo_decorrido_ms,
        "tempo_final_ms": estado.tempo_final_ms,
        "status_corrida": estado.status_corrida.value if estado.status_corrida else None,
        "sucesso": estado.sucesso,
        "ultimo_timestamp_ms": estado.ultimo_timestamp_ms,
        "alerta_bateria_critica": estado.alerta_bateria_critica,
        "alerta_possivel_parada_inesperada": estado.alerta_possivel_parada_inesperada,
        "alerta_dado_invalido": estado.alerta_dado_invalido,
        "alerta_temperatura_critica": estado.alerta_temperatura_critica,
        "temperatura_atual": estado.temperatura_atual,
        "log_alertas": [
            alerta.model_dump(mode="json")
            for alerta in estado.log_alertas
        ],
    }


def _persistir_novos_alertas(
    session: Session,
    estado_anterior: IndicadoresDesempenho,
    estado_atual: IndicadoresDesempenho,
) -> bool:
    """Persiste apenas os alertas emitidos no processamento do pacote atual."""
    if estado_atual.id_corrida_banco is None:
        return False

    novos_alertas = estado_atual.log_alertas[len(estado_anterior.log_alertas):]
    if not novos_alertas:
        return False

    for alerta in novos_alertas:
        session.add(
            Evento(
                id_corrida=estado_atual.id_corrida_banco,
                tipo_evento=alerta.tipo.value,
                descricao=alerta.mensagem,
                timestamp_ms=alerta.timestamp_ms,
            )
        )

    return True


def _persistir_passo_percurso(
    session: Session,
    id_corrida: int,
    x: float,
    y: float,
    tipo_percurso: str = "exploratorio",
) -> None:
    """Persiste um passo do percurso para a posição (x, y) do Micromouse.

    Reutiliza a Célula existente para aquela coordenada+labirinto, ou cria
    uma nova (com paredes nulas) se for a primeira vez que o robô visita a posição.
    """
    # Recupera o id_labirinto a partir da corrida
    corrida = session.get(Corrida, id_corrida)
    if corrida is None:
        logger.warning(
            "_persistir_passo_percurso: corrida %d não encontrada.", id_corrida)
        return

    # Encontra ou cria a Célula correspondente à posição
    celula = session.exec(
        select(Celula)
        .where(Celula.coordenada_x == int(x))
        .where(Celula.coordenada_y == int(y))
        .where(Celula.id_labirinto == corrida.id_labirinto)
    ).first()

    if celula is None:
        celula = Celula(
            coordenada_x=int(x),
            coordenada_y=int(y),
            id_labirinto=corrida.id_labirinto,
        )
        session.add(celula)
        session.flush()  # Garante id_celula antes de criar Percurso

    # Registra passagem pelo passo do percurso
    passo = Percurso(
        id_celula=celula.id_celula,
        id_corrida=id_corrida,
        data_hora_passagem=datetime.now(UTC),
        tipo_percurso=tipo_percurso,
    )
    session.add(passo)
