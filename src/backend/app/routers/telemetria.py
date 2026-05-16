"""Router de Telemetria — WebSocket para indicadores em tempo real."""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..schemas.telemetria import IndicadoresDesempenho
from ..services.telemetria import atualizar_indicadores, criar_estado_inicial

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/telemetria", tags=["telemetria"])


@router.websocket("/ws")
async def websocket_telemetria(websocket: WebSocket) -> None:
    """Endpoint WebSocket para receber pacotes de telemetria e retransmitir
    indicadores de desempenho atualizados.

    Fluxo:
        1. Cliente conecta.
        2. Cliente envia pacotes JSON de telemetria (inicial, movimentação, final).
        3. Servidor processa cada pacote, atualiza indicadores e envia estado atualizado.
        4. Conexão encerrada pelo cliente ou por erro.
    """
    await websocket.accept()
    logger.info("WebSocket de telemetria: cliente conectado.")

    estado = criar_estado_inicial()

    try:
        while True:
            # Receber pacote JSON
            data = await websocket.receive_text()

            try:
                pacote = json.loads(data)
            except json.JSONDecodeError:
                logger.warning("WebSocket: JSON inválido recebido.")
                await websocket.send_json(
                    {"erro": "JSON inválido", "indicadores": _estado_to_dict(estado)}
                )
                continue

            # Atualizar indicadores
            estado = atualizar_indicadores(estado, pacote)

            # Enviar estado atualizado
            await websocket.send_json(_estado_to_dict(estado))

    except WebSocketDisconnect:
        logger.info("WebSocket de telemetria: cliente desconectado.")
    except Exception:
        logger.exception("WebSocket de telemetria: erro inesperado.")
        await websocket.close(code=1011, reason="Erro interno do servidor.")


def _estado_to_dict(estado: IndicadoresDesempenho) -> dict:
    """Converte o estado dos indicadores para dicionário serializável,
    excluindo campos internos (prefixados com _)."""
    return {
        "id_corrida": estado.id_corrida,
        "bateria_atual": estado.bateria_atual,
        "velocidade_media": estado.velocidade_media,
        "tempo_decorrido_ms": estado.tempo_decorrido_ms,
        "tempo_final_ms": estado.tempo_final_ms,
        "status_corrida": estado.status_corrida.value,
        "sucesso": estado.sucesso,
        "ultimo_timestamp_ms": estado.ultimo_timestamp_ms,
        "alerta_bateria_critica": estado.alerta_bateria_critica,
        "alerta_dado_invalido": estado.alerta_dado_invalido,
    }
