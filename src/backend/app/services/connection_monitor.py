"""Serviço de monitoramento de conexão do Micromouse.

Responsabilidades:
  • Rastrear o último pacote válido recebido por corrida (id_corrida).
  • Detectar timeout de 3 segundos sem pacote válido → status "offline".
  • Restaurar status "online" ao receber novo pacote válido.
  • Notificar o frontend via WebSocket quando o status mudar.

A rotina periódica (_check_timeouts_loop) deve ser iniciada no lifespan
da aplicação FastAPI e cancelada no shutdown.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, UTC
from typing import Dict

from .websocket_manager import manager

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

CONNECTION_TIMEOUT_SECONDS: float = 3.0
"""Tempo máximo sem pacote válido para considerar offline."""

CHECK_INTERVAL_SECONDS: float = 1.0
"""Intervalo entre verificações periódicas de timeout."""


# ---------------------------------------------------------------------------
# Estado de conexão por corrida
# ---------------------------------------------------------------------------


class ConnectionState:
    """Estado de conexão de uma corrida individual."""

    __slots__ = ("status", "last_seen")

    def __init__(self) -> None:
        self.status: str = "online"
        self.last_seen: datetime = datetime.now(UTC)

    def touch(self) -> None:
        """Atualiza o último momento em que um pacote válido foi recebido."""
        self.last_seen = datetime.now(UTC)

    def is_timed_out(self, timeout_seconds: float = CONNECTION_TIMEOUT_SECONDS) -> bool:
        """Retorna True se o tempo desde o último pacote excede o timeout."""
        elapsed = (datetime.now(UTC) - self.last_seen).total_seconds()
        return elapsed > timeout_seconds


# ---------------------------------------------------------------------------
# Monitor de Conexão (singleton)
# ---------------------------------------------------------------------------


class ConnectionMonitor:
    """Gerencia o estado de conexão de todas as corridas ativas."""

    def __init__(self) -> None:
        self._states: Dict[int, ConnectionState] = {}
        self._task: asyncio.Task | None = None

    # -- Acesso ao estado --------------------------------------------------

    @property
    def states(self) -> Dict[int, ConnectionState]:
        """Acesso direto ao dicionário de estados (para testes)."""
        return self._states

    def get_status(self, id_corrida: int) -> str | None:
        """Retorna o status atual de uma corrida, ou None se não rastreada."""
        state = self._states.get(id_corrida)
        return state.status if state else None

    # -- Registro de pacote ------------------------------------------------

    async def registrar_pacote(self, id_corrida: int) -> None:
        """Registra a chegada de um pacote válido para uma corrida.

        Se a corrida estava offline (ou é nova), marca como online e
        notifica o frontend via WebSocket.
        """
        state = self._states.get(id_corrida)

        if state is None:
            # Nova corrida — registrar e notificar online
            state = ConnectionState()
            self._states[id_corrida] = state
            await self._notificar_status(id_corrida, "online",
                                         "Conexão estabelecida")
            return

        state.touch()

        if state.status == "offline":
            state.status = "online"
            await self._notificar_status(id_corrida, "online",
                                         "Conexão restabelecida")

    # -- Remoção de corrida ------------------------------------------------

    def remover_corrida(self, id_corrida: int) -> None:
        """Remove a corrida do monitoramento (ex.: após pacote final)."""
        self._states.pop(id_corrida, None)

    # -- Rotina periódica de timeout ---------------------------------------

    async def _check_timeouts(self) -> None:
        """Verifica todas as corridas ativas e marca como offline se timeout."""
        for id_corrida, state in list(self._states.items()):
            if state.status == "online" and state.is_timed_out():
                state.status = "offline"
                logger.info(
                    "Corrida %s marcada como offline (timeout de %.1fs)",
                    id_corrida, CONNECTION_TIMEOUT_SECONDS,
                )
                await self._notificar_status(
                    id_corrida, "offline",
                    f"Sem pacotes há mais de {CONNECTION_TIMEOUT_SECONDS:.0f} segundos",
                )

    async def _check_timeouts_loop(self) -> None:
        """Loop infinito que verifica timeouts periodicamente."""
        try:
            while True:
                await self._check_timeouts()
                await asyncio.sleep(CHECK_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            logger.info("Loop de verificação de timeout cancelado.")

    def start(self) -> None:
        """Inicia a task de verificação periódica de timeout."""
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._check_timeouts_loop())
            logger.info("Monitor de conexão iniciado.")

    def stop(self) -> None:
        """Cancela a task de verificação periódica."""
        if self._task is not None and not self._task.done():
            self._task.cancel()
            logger.info("Monitor de conexão parado.")

    # -- Notificação via WebSocket -----------------------------------------

    async def _notificar_status(
        self, id_corrida: int, status: str, message: str
    ) -> None:
        """Envia evento de status de conexão para todos os clientes WebSocket."""
        evento = {
            "type": "CONNECTION_STATUS",
            "data": {
                "id_corrida": id_corrida,
                "status": status,
                "message": message,
            },
        }
        await manager.send_json_to_all_clients(evento)

    # -- Limpeza (para testes) ---------------------------------------------

    def clear(self) -> None:
        """Remove todos os estados e para a task."""
        self.stop()
        self._states.clear()


# Instância singleton
connection_monitor = ConnectionMonitor()
