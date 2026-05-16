from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..services.websocket_manager import manager

router = APIRouter(tags=["telemetria"])

@router.websocket("/api/ws/dashboard")
async def websocket_endpoint(websocket: WebSocket):
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
