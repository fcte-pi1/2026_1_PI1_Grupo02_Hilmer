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
# Estado em memória — sessão única ativa
# ---------------------------------------------------------------------------
estados_ativos: Dict[int, IndicadoresDesempenho] = {}
_sessao_ativa_id: int | None = None
_contador_sessao: int = 0


def _gerar_sessao_id() -> int:
    global _contador_sessao
    _contador_sessao += 1
    return _contador_sessao


def _get_sessao_ativa_id() -> int | None:
    return _sessao_ativa_id


def _set_sessao_ativa_id(sid: int | None) -> None:
    global _sessao_ativa_id
    _sessao_ativa_id = sid


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

    # Enviar status atual de todas as corridas ativas para o novo cliente
    for sid in estados_ativos:
        status = connection_monitor.get_status(sid) or "online"
        await manager.send_json_to_client({
            "type": "CONNECTION_STATUS",
            "data": {
                "id_corrida": sid,
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

    O ESP32 não envia ``id_corrida``; o backend gerencia uma sessão
    única ativa por vez.
    """
    pacote = payload
    tipo = identificar_tipo_pacote(pacote)

    # --- Validação inicial ---
    sessao_id = _get_sessao_ativa_id()

    # Determinar último timestamp para validar regressão
    ultimo_ts = None
    if sessao_id is not None and sessao_id in estados_ativos:
        ultimo_ts = estados_ativos[sessao_id].ultimo_timestamp_ms
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

    # --- Gerenciamento de sessão ---
    if tipo == TipoPacote.INICIAL:
        # Encerrar qualquer corrida ativa anterior
        if sessao_id is not None and sessao_id in estados_ativos:
            await _abortar_corrida_ativa(session, sessao_id)

        # Criar nova sessão
        sessao_id = _gerar_sessao_id()
        _set_sessao_ativa_id(sessao_id)
        estados_ativos[sessao_id] = criar_estado_inicial()
        await connection_monitor.registrar_pacote(sessao_id)
    else:
        # Para pacotes não-iniciais, deve existir uma sessão ativa
        if sessao_id is None or sessao_id not in estados_ativos:
            raise HTTPException(
                status_code=409,
                detail={
                    "mensagem": "Nenhuma corrida ativa. Envie um pacote inicial (tipo=0) primeiro."},
            )
        await connection_monitor.registrar_pacote(sessao_id)

    estado_atual = estados_ativos[sessao_id]

    # Processa os indicadores puros (Cálculos de velocidade, etc)
    novo_estado = atualizar_indicadores(estado_atual, pacote)

    commit_realizado = False

    # Se for pacote inicial, resolver a dimensão e criar no banco
    tipo_lab = None
    if tipo == TipoPacote.INICIAL and novo_estado.id_corrida_banco is None:
        dimensao = pacote.get("dimensao")
        if int(dimensao) == 8:
            tipo_lab = TipoLabirinto.OITO
        elif int(dimensao) == 16:
            tipo_lab = TipoLabirinto.DEZESSEIS
        elif int(dimensao) == 4:
            tipo_lab = TipoLabirinto.QUATRO

        labirinto = Labirinto(tipo_labirinto=tipo_lab)
        session.add(labirinto)
        session.flush()

        corrida = Corrida(
            sessao_hardware_id=sessao_id,
            data_hora_inicio=datetime.now(UTC),
            id_labirinto=labirinto.id_labirinto,
            status_corrida=StatusCorrida.EM_ANDAMENTO,
            bateria_inicial=pacote.get("bateria", 100)
        )
        session.add(corrida)
        session.flush()

        # Atualiza o estado com o ID real do banco
        novo_estado.id_corrida_banco = corrida.id_corrida
        novo_estado.sessao_hardware_id = sessao_id
        _persistir_novos_alertas(session, estado_atual, novo_estado)
        session.commit()
        session.refresh(corrida)
        commit_realizado = True

    # Se for pacote de movimentação, persistir step no percurso exploratório
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
                _persistir_novos_alertas(session, estado_atual, novo_estado)
                session.commit()
                commit_realizado = True

    # Se for pacote de rota otimizada, persistir toda a rota
    if tipo == TipoPacote.ROTA and novo_estado.id_corrida_banco is not None:
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
                _persistir_novos_alertas(session, estado_atual, novo_estado)
                session.commit()
                commit_realizado = True

    # Se for pacote final, atualizar o banco de dados
    if tipo == TipoPacote.FINAL and novo_estado.id_corrida_banco is not None:
        corrida = session.get(Corrida, novo_estado.id_corrida_banco)
        if corrida:
            corrida.status_corrida = StatusCorrida.CONCLUIDA
            corrida.data_hora_fim = datetime.now(UTC)
            corrida.bateria_final = novo_estado.bateria_final
            corrida.velocidade_media = novo_estado.velocidade_media
            corrida.tempo_total = novo_estado.tempo_final_ms
            corrida.desafio_cumprido = novo_estado.sucesso
            session.add(corrida)
            _persistir_novos_alertas(session, estado_atual, novo_estado)
            session.commit()
            commit_realizado = True

    # Se for heartbeat, apenas persistir eventuais alertas novos
    if tipo == TipoPacote.HEARTBEAT and novo_estado.id_corrida_banco is not None:
        if not commit_realizado and _persistir_novos_alertas(session, estado_atual, novo_estado):
            session.commit()
            commit_realizado = True

    # Se for alerta de temperatura crítica, encerrar a corrida no banco
    if tipo == TipoPacote.ALERTA_TEMPERATURA and novo_estado.id_corrida_banco is not None:
        corrida = session.get(Corrida, novo_estado.id_corrida_banco)
        if corrida and corrida.status_corrida == StatusCorrida.EM_ANDAMENTO:
            corrida.status_corrida = StatusCorrida.ABORTADA
            corrida.data_hora_fim = datetime.now(UTC)
            corrida.bateria_final = novo_estado.bateria_atual
            corrida.tempo_total = novo_estado.tempo_final_ms
            session.add(corrida)
            _persistir_novos_alertas(session, estado_atual, novo_estado)
            session.commit()
            commit_realizado = True

    if not commit_realizado and _persistir_novos_alertas(session, estado_atual, novo_estado):
        session.commit()

    # Salva o novo estado na memória
    estados_ativos[sessao_id] = novo_estado

    # Faz o broadcast para o Dashboard via WebSocket
    estado_dict = _estado_to_dict(novo_estado)
    # print("Estado dict", estado_dict)
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

    # print(f"Broadcasting evento: {evento}")
    # print()
    await manager.send_json_to_all_clients(evento)
    if tipo in (TipoPacote.FINAL, TipoPacote.ALERTA_TEMPERATURA):
        del estados_ativos[sessao_id]
        connection_monitor.remover_corrida(sessao_id)
        _set_sessao_ativa_id(None)
    return {"message": "Pacote processado com sucesso", "estado": estado_dict}


async def _abortar_corrida_ativa(
    session: Session,
    sessao_id: int,
) -> None:
    """Aborta a corrida ativa quando uma nova sessão é iniciada.

    Garante que apenas uma corrida esteja ativa por vez,
    abortando a anterior com status ABORTADA no banco de dados.
    """
    estado = estados_ativos.pop(sessao_id, None)
    if estado is None:
        return

    # Atualizar registro no banco se existir
    if estado.id_corrida_banco is not None:
        corrida = session.get(Corrida, estado.id_corrida_banco)
        if corrida and corrida.status_corrida == StatusCorrida.EM_ANDAMENTO:
            corrida.status_corrida = StatusCorrida.ABORTADA
            corrida.data_hora_fim = datetime.now(UTC)
            session.add(corrida)

    connection_monitor.remover_corrida(sessao_id)
    session.commit()

    await manager.send_json_to_all_clients({
        "type": "SESSAO_ENCERRADA",
        "data": {
            "sessao_encerrada": sessao_id,
            "motivo": "Nova sessão iniciada pelo Micromouse",
        }
    })

    logger.info(
        "Corrida encerrada automaticamente: %s", sessao_id
    )


def _estado_to_dict(estado: IndicadoresDesempenho) -> dict:
    """Converte o estado dos indicadores para dicionário serializável."""
    return {
        "id_corrida_banco": estado.id_corrida_banco,
        "sessao_hardware_id": estado.sessao_hardware_id,
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
