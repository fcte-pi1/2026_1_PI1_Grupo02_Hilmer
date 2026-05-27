"""Testes unitários para o serviço de monitoramento de conexão (US-09).

Cenários cobertos:
  • Registrar pacote marca corrida como online.
  • Corrida fica offline após timeout de 3 segundos.
  • Corrida volta a ficar online ao receber novo pacote.
  • Remover corrida limpa o estado.
  • Notificações WebSocket são enviadas nas transições.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, UTC
from unittest.mock import AsyncMock, patch

import pytest

from app.services.connection_monitor import (
    ConnectionMonitor,
    ConnectionState,
    CONNECTION_TIMEOUT_SECONDS,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def monitor():
    """Cria um ConnectionMonitor limpo para cada teste."""
    m = ConnectionMonitor()
    yield m
    m.clear()


# ---------------------------------------------------------------------------
# Testes do ConnectionState
# ---------------------------------------------------------------------------


class TestConnectionState:
    """Testes para a classe ConnectionState."""

    def test_estado_inicial_e_online(self):
        state = ConnectionState()
        assert state.status == "online"

    def test_touch_atualiza_last_seen(self):
        state = ConnectionState()
        old_seen = state.last_seen
        state.touch()
        assert state.last_seen >= old_seen

    def test_is_timed_out_false_quando_recente(self):
        state = ConnectionState()
        assert state.is_timed_out() is False

    def test_is_timed_out_true_quando_antigo(self):
        state = ConnectionState()
        state.last_seen = datetime.now(UTC) - timedelta(seconds=5)
        assert state.is_timed_out() is True

    def test_is_timed_out_com_timeout_customizado(self):
        state = ConnectionState()
        state.last_seen = datetime.now(UTC) - timedelta(seconds=2)
        assert state.is_timed_out(timeout_seconds=1.0) is True
        assert state.is_timed_out(timeout_seconds=5.0) is False


# ---------------------------------------------------------------------------
# Testes do ConnectionMonitor — registrar pacote
# ---------------------------------------------------------------------------


class TestRegistrarPacote:
    """Testes para o método registrar_pacote do ConnectionMonitor."""

    @pytest.mark.asyncio
    async def test_nova_corrida_fica_online(self, monitor: ConnectionMonitor):
        with patch.object(monitor, "_notificar_status", new_callable=AsyncMock) as mock_notify:
            await monitor.registrar_pacote(1001)

            assert monitor.get_status(1001) == "online"
            mock_notify.assert_called_once_with(1001, "online", "Conexão estabelecida")

    @pytest.mark.asyncio
    async def test_pacote_em_corrida_existente_atualiza_last_seen(self, monitor: ConnectionMonitor):
        with patch.object(monitor, "_notificar_status", new_callable=AsyncMock):
            await monitor.registrar_pacote(1001)
            state = monitor.states[1001]
            old_seen = state.last_seen

            await monitor.registrar_pacote(1001)
            assert state.last_seen >= old_seen

    @pytest.mark.asyncio
    async def test_pacote_restaura_online_apos_offline(self, monitor: ConnectionMonitor):
        with patch.object(monitor, "_notificar_status", new_callable=AsyncMock) as mock_notify:
            await monitor.registrar_pacote(1001)
            # Simular estado offline
            monitor.states[1001].status = "offline"

            await monitor.registrar_pacote(1001)

            assert monitor.get_status(1001) == "online"
            # Segunda chamada deve ser "Conexão restabelecida"
            assert mock_notify.call_count == 2
            mock_notify.assert_called_with(1001, "online", "Conexão restabelecida")


# ---------------------------------------------------------------------------
# Testes do ConnectionMonitor — timeout
# ---------------------------------------------------------------------------


class TestCheckTimeouts:
    """Testes para a verificação de timeout."""

    @pytest.mark.asyncio
    async def test_corrida_fica_offline_apos_timeout(self, monitor: ConnectionMonitor):
        with patch.object(monitor, "_notificar_status", new_callable=AsyncMock) as mock_notify:
            await monitor.registrar_pacote(1001)
            mock_notify.reset_mock()

            # Simular que o último pacote foi há mais de 3 segundos
            monitor.states[1001].last_seen = datetime.now(UTC) - timedelta(
                seconds=CONNECTION_TIMEOUT_SECONDS + 1
            )

            await monitor._check_timeouts()

            assert monitor.get_status(1001) == "offline"
            mock_notify.assert_called_once()
            call_args = mock_notify.call_args
            assert call_args[0][0] == 1001
            assert call_args[0][1] == "offline"

    @pytest.mark.asyncio
    async def test_corrida_nao_fica_offline_antes_do_timeout(self, monitor: ConnectionMonitor):
        with patch.object(monitor, "_notificar_status", new_callable=AsyncMock) as mock_notify:
            await monitor.registrar_pacote(1001)
            mock_notify.reset_mock()

            # last_seen é agora, não deve ser timeout
            await monitor._check_timeouts()

            assert monitor.get_status(1001) == "online"
            mock_notify.assert_not_called()

    @pytest.mark.asyncio
    async def test_corrida_ja_offline_nao_notifica_novamente(self, monitor: ConnectionMonitor):
        with patch.object(monitor, "_notificar_status", new_callable=AsyncMock) as mock_notify:
            await monitor.registrar_pacote(1001)
            monitor.states[1001].status = "offline"
            monitor.states[1001].last_seen = datetime.now(UTC) - timedelta(seconds=10)
            mock_notify.reset_mock()

            await monitor._check_timeouts()

            # Já está offline, não deve notificar de novo
            mock_notify.assert_not_called()


# ---------------------------------------------------------------------------
# Testes do ConnectionMonitor — remover corrida
# ---------------------------------------------------------------------------


class TestRemoverCorrida:
    """Testes para o método remover_corrida."""

    @pytest.mark.asyncio
    async def test_remover_corrida_limpa_estado(self, monitor: ConnectionMonitor):
        with patch.object(monitor, "_notificar_status", new_callable=AsyncMock):
            await monitor.registrar_pacote(1001)
            assert monitor.get_status(1001) == "online"

            monitor.remover_corrida(1001)
            assert monitor.get_status(1001) is None

    def test_remover_corrida_inexistente_nao_falha(self, monitor: ConnectionMonitor):
        monitor.remover_corrida(9999)  # Não deve lançar exceção


# ---------------------------------------------------------------------------
# Testes do ConnectionMonitor — notificação WebSocket
# ---------------------------------------------------------------------------


class TestNotificacaoWebSocket:
    """Testes para a notificação via WebSocket."""

    @pytest.mark.asyncio
    async def test_notificacao_envia_formato_correto(self, monitor: ConnectionMonitor):
        with patch(
            "app.services.connection_monitor.manager.send_json_to_all_clients",
            new_callable=AsyncMock,
        ) as mock_ws:
            await monitor.registrar_pacote(1001)

            mock_ws.assert_called_once()
            evento = mock_ws.call_args[0][0]

            assert evento["type"] == "CONNECTION_STATUS"
            assert evento["data"]["id_corrida"] == 1001
            assert evento["data"]["status"] == "online"
            assert "message" in evento["data"]

    @pytest.mark.asyncio
    async def test_notificacao_offline_envia_formato_correto(self, monitor: ConnectionMonitor):
        with patch(
            "app.services.connection_monitor.manager.send_json_to_all_clients",
            new_callable=AsyncMock,
        ) as mock_ws:
            await monitor.registrar_pacote(1001)
            mock_ws.reset_mock()

            monitor.states[1001].last_seen = datetime.now(UTC) - timedelta(seconds=5)
            await monitor._check_timeouts()

            mock_ws.assert_called_once()
            evento = mock_ws.call_args[0][0]

            assert evento["type"] == "CONNECTION_STATUS"
            assert evento["data"]["id_corrida"] == 1001
            assert evento["data"]["status"] == "offline"
            assert "message" in evento["data"]


# ---------------------------------------------------------------------------
# Teste do fluxo completo: online → offline → online
# ---------------------------------------------------------------------------


class TestFluxoCompleto:
    """Testa o ciclo completo de vida da conexão."""

    @pytest.mark.asyncio
    async def test_ciclo_online_offline_online(self, monitor: ConnectionMonitor):
        with patch.object(monitor, "_notificar_status", new_callable=AsyncMock) as mock_notify:
            # 1. Primeiro pacote → online
            await monitor.registrar_pacote(1001)
            assert monitor.get_status(1001) == "online"

            # 2. Simular timeout → offline
            monitor.states[1001].last_seen = datetime.now(UTC) - timedelta(seconds=5)
            await monitor._check_timeouts()
            assert monitor.get_status(1001) == "offline"

            # 3. Novo pacote → online novamente
            await monitor.registrar_pacote(1001)
            assert monitor.get_status(1001) == "online"

            # Verificar sequência de notificações
            assert mock_notify.call_count == 3
            calls = [call[0] for call in mock_notify.call_args_list]
            assert calls[0] == (1001, "online", "Conexão estabelecida")
            assert calls[1][1] == "offline"
            assert calls[2] == (1001, "online", "Conexão restabelecida")

    @pytest.mark.asyncio
    async def test_multiplas_corridas_independentes(self, monitor: ConnectionMonitor):
        with patch.object(monitor, "_notificar_status", new_callable=AsyncMock):
            await monitor.registrar_pacote(1001)
            await monitor.registrar_pacote(2002)

            # Timeout apenas na corrida 1001
            monitor.states[1001].last_seen = datetime.now(UTC) - timedelta(seconds=5)
            await monitor._check_timeouts()

            assert monitor.get_status(1001) == "offline"
            assert monitor.get_status(2002) == "online"
