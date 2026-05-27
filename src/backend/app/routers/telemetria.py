from datetime import datetime, UTC
from typing import Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlmodel import Session
import logging

from ..database import get_session
from ..services.telemetria import atualizar_indicadores, criar_estado_inicial, identificar_tipo_pacote
from ..schemas.telemetria import IndicadoresDesempenho, TipoPacote
from ..services.websocket_manager import manager
from ..services.connection_monitor import connection_monitor
from ..models.corrida import Corrida
from ..models.evento import Evento
from ..models.labirinto import Labirinto
from ..models.enums import StatusCorrida, TipoLabirinto
from ..schemas.telemetria import PacoteInicial, PacoteMovimentacao, PacoteFinal
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/telemetria", tags=["telemetria"])

# Armazenamento em memória do estado das corridas ativas
estados_ativos: Dict[int, IndicadoresDesempenho] = {}


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
    try:
        while True:
            await websocket.receive_json()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@router.post("/pacote", status_code=201)
async def receber_pacote_telemetria(
    payload: PacoteInicial | PacoteMovimentacao | PacoteFinal,
    session: Session = Depends(get_session)
):
    """
    Endpoint HTTP para o Micromouse enviar pacotes de telemetria.
    Recebe o pacote, atualiza o estado em memória e notifica o Dashboard.
    """
    pacote = payload.model_dump()
    tipo = identificar_tipo_pacote(pacote)
    # print(f"Tipo de pacote: {tipo}")
    # print(f"Payload: {pacote}")
    if tipo == TipoPacote.INVALIDO:
        raise HTTPException(
            status_code=400, detail="Pacote inválido ou não reconhecido")

    # --- Registrar pacote válido no monitor de conexão ---
    await connection_monitor.registrar_pacote(pacote.get("id_corrida", 0))

    sessao_hardware_id = pacote.get("id_corrida")
    if sessao_hardware_id is None:
        raise HTTPException(
            status_code=400, detail="id_corrida ausente no pacote")

    # Encerrar corridas ativas anteriores se um novo pacote inicial chegar
    if tipo == TipoPacote.INICIAL and estados_ativos:
        await _abortar_corridas_ativas(session, sessao_hardware_id)

    # Recupera ou inicializa o estado em memória
    if sessao_hardware_id not in estados_ativos:
        estados_ativos[sessao_hardware_id] = criar_estado_inicial()

    estado_atual = estados_ativos[sessao_hardware_id]

    # Processa os indicadores puros
    novo_estado = atualizar_indicadores(estado_atual, pacote)

    commit_realizado = False

    # Se for pacote inicial, resolver a dimensão e criar no banco se necessário
    tipo_lab = None
    if tipo == TipoPacote.INICIAL and novo_estado.id_corrida_banco is None:
        dimensao = pacote.get("dimensao")
        if int(dimensao) == 8:
            tipo_lab = TipoLabirinto.OITO
        elif int(dimensao) == 16:
            tipo_lab = TipoLabirinto.DEZESSEIS
        elif int(dimensao) == 4:
            tipo_lab = TipoLabirinto.QUATRO
        else:
            raise HTTPException(
                status_code=400, detail="Dimensão inválida do labirinto")

        labirinto = Labirinto(tipo_labirinto=tipo_lab)
        session.add(labirinto)
        session.flush()

        corrida = Corrida(
            sessao_hardware_id=sessao_hardware_id,
            data_hora_inicio=datetime.now(UTC),
            id_labirinto=labirinto.id_labirinto,
            status_corrida=StatusCorrida.EM_ANDAMENTO,
            tentativa=pacote.get("tentativa", 1),
            bateria_inicial=pacote.get("bateria", 100.0)
        )
        session.add(corrida)
        session.flush()

        # Atualiza o estado com o ID real do banco
        novo_estado.id_corrida_banco = corrida.id_corrida
        novo_estado.sessao_hardware_id = corrida.sessao_hardware_id
        _persistir_novos_alertas(session, estado_atual, novo_estado)
        session.commit()
        session.refresh(corrida)
        commit_realizado = True
    # Se for pacote final, atualizar o banco de dados
    if tipo == TipoPacote.FINAL and novo_estado.id_corrida_banco is not None:
        corrida = session.get(Corrida, novo_estado.id_corrida_banco)
        if corrida:
            corrida.status_corrida = StatusCorrida.CONCLUIDA if novo_estado.sucesso else StatusCorrida.FALHA
            corrida.data_hora_fim = datetime.now(UTC)
            corrida.bateria_final = novo_estado.bateria_final
            corrida.velocidade_media = novo_estado.velocidade_media
            corrida.desafio_cumprido = novo_estado.sucesso
            session.add(corrida)
            _persistir_novos_alertas(session, estado_atual, novo_estado)
            session.commit()
            commit_realizado = True

    if not commit_realizado and _persistir_novos_alertas(session, estado_atual, novo_estado):
        session.commit()

    # Salva o novo estado na memória
    estados_ativos[sessao_hardware_id] = novo_estado

    # Faz o broadcast para o Dashboard via WebSocket
    estado_dict = _estado_to_dict(novo_estado)

    if tipo == TipoPacote.INICIAL:
        evento = {
            "type": "SESSAO_INICIADA",
            "data": {
                **estado_dict,
                "dimensao": tipo_lab.value,
                "tentativa": pacote.get("tentativa", 1),
            }
        }
    else:
        evento = {
            "type": "ATUALIZACAO_TELEMETRIA",
            "data": estado_dict
        }

    await manager.send_json_to_all_clients(evento)
    if tipo == TipoPacote.FINAL:
        del estados_ativos[sessao_hardware_id]
        connection_monitor.remover_corrida(sessao_hardware_id)
    return {"message": "Pacote processado com sucesso", "estado": estado_dict}


async def _abortar_corridas_ativas(
    session: Session,
    novo_sessao_id: int,
) -> None:
    """Aborta corridas ativas quando uma nova sessão é iniciada.

    Garante que apenas uma corrida esteja ativa por vez,
    abortando as anteriores com status ABORTADA no banco de dados.
    """
    ids_para_remover = [
        sid for sid in estados_ativos
        if sid != novo_sessao_id
    ]

    if not ids_para_remover:
        return

    for sid in ids_para_remover:
        estado = estados_ativos.pop(sid)

        # Atualizar registro no banco se existir
        if estado.id_corrida_banco is not None:
            corrida = session.get(Corrida, estado.id_corrida_banco)
            if corrida and corrida.status_corrida == StatusCorrida.EM_ANDAMENTO:
                corrida.status_corrida = StatusCorrida.ABORTADA
                corrida.data_hora_fim = datetime.now(UTC)
                session.add(corrida)

        connection_monitor.remover_corrida(sid)

    session.commit()

    await manager.send_json_to_all_clients({
        "type": "SESSAO_ENCERRADA",
        "data": {
            "sessoes_encerradas": ids_para_remover,
            "motivo": "Nova sessão iniciada pelo Micromouse",
        }
    })

    logger.info(
        "Corridas encerradas automaticamente: %s", ids_para_remover
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
