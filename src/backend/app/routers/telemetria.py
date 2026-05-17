from datetime import datetime, UTC
from typing import Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlmodel import Session
import logging

from ..database import get_session
from ..services.telemetria import atualizar_indicadores, criar_estado_inicial, identificar_tipo_pacote
from ..schemas.telemetria import IndicadoresDesempenho, TipoPacote
from ..services.websocket_manager import manager
from ..models.corrida import Corrida
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
    confirmation_message = {
        "message": "connected"
    }
    await manager.send_json_to_client(confirmation_message, websocket)
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

    sessao_hardware_id = pacote.get("id_corrida")
    if sessao_hardware_id is None:
        raise HTTPException(
            status_code=400, detail="id_corrida ausente no pacote")

    # Recupera ou inicializa o estado em memória
    if sessao_hardware_id not in estados_ativos:
        estados_ativos[sessao_hardware_id] = criar_estado_inicial()

    estado_atual = estados_ativos[sessao_hardware_id]

    # Processa os indicadores puros
    novo_estado = atualizar_indicadores(estado_atual, pacote)

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
        session.commit()
        session.refresh(corrida)

        # Atualiza o estado com o ID real do banco
        novo_estado.id_corrida_banco = corrida.id_corrida
        novo_estado.sessao_hardware_id = corrida.sessao_hardware_id
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

    return {"message": "Pacote processado com sucesso", "estado": estado_dict}


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
        "alerta_dado_invalido": estado.alerta_dado_invalido,
    }
