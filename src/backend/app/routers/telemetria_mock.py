from datetime import datetime, UTC
from fastapi import APIRouter, Depends
from sqlmodel import Session

from ..database import get_session
from ..models.corrida import Corrida
from ..models.enums import StatusCorrida, TipoLabirinto
from ..models.labirinto import Labirinto
from ..schemas.telemetria import PacoteConfiguracao
from ..services.websocket_manager import manager

router = APIRouter(tags=["telemetria-mock"])


@router.post("/api/test/mock_telemetria/configuracao", status_code=201)
async def mock_pacote_configuracao(
    payload: PacoteConfiguracao,
    session: Session = Depends(get_session)
):
    """
    Simulador de Ingestão: Recebe o JSON do micromouse(Pacote de configuração).
    Salva a sessão no banco e faz o broadcast para o WebSocket.
    """
    # Mapear dimensao para TipoLabirinto
    tipo_lab = TipoLabirinto.QUATRO
    if payload.dimensao == 8:
        tipo_lab = TipoLabirinto.OITO
    elif payload.dimensao == 16:
        tipo_lab = TipoLabirinto.DEZESSEIS

    # Criar Labirinto e Corrida
    labirinto = Labirinto(tipo_labirinto=tipo_lab)
    session.add(labirinto)
    session.flush()

    corrida = Corrida(
        sessao_hardware_id=payload.id_corrida,
        data_hora_inicio=datetime.now(UTC),
        id_labirinto=labirinto.id_labirinto,
        status_corrida=StatusCorrida.EM_ANDAMENTO,
        tentativa=payload.tentativa,
        bateria_inicial=payload.bateria
    )
    session.add(corrida)
    session.commit()
    session.refresh(corrida)

    # Montar evento de broadcast
    evento = {
        "type": "CONFIG_INICIAL",
        "data": {
            "id_corrida_banco": corrida.id_corrida,
            "sessao_hardware_id": corrida.sessao_hardware_id,
            "dimensao": payload.dimensao,
            "tentativa": corrida.tentativa,
            "bateria_inicial": corrida.bateria_inicial,
            "status": corrida.status_corrida
        }
    }

    # Transmitir para todos os dashboards conectados
    await manager.send_json_to_all_clients(evento)

    return {"message": "Pacote de configuração processado e transmitido com sucesso.", "corrida_id": corrida.id_corrida}
