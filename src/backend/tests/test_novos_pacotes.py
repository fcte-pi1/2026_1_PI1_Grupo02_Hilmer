"""Testes para os novos pacotes: Heartbeat (tipo=4) e Alerta de Temperatura (tipo=5)."""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.schemas.telemetria import TipoPacote, TipoAlertaTelemetria, StatusCorridaTelemetria
from app.services.telemetria import (
    atualizar_indicadores,
    criar_estado_inicial,
    identificar_tipo_pacote,
    validar_pacote,
)
from app.models.corrida import Corrida
from app.models.evento import Evento
from app.models.enums import StatusCorrida
from app.routers.telemetria import _get_id_corrida_atual

# =========================================================================
# Pacotes de teste
# =========================================================================

PACOTE_INICIAL = {"tipo": 0, "timestamp_ms": 0, "dimensao": 4, "bateria": 95}
PACOTE_HEARTBEAT = {"tipo": 4, "timestamp_ms": 1500, "bateria": 93}
PACOTE_HEARTBEAT_CRITICA = {"tipo": 4, "timestamp_ms": 2000, "bateria": 5}
PACOTE_TEMP = {"tipo": 5, "timestamp_ms": 7800, "temp_c": 61.0}
PACOTE_TEMP_SEM_CAMPO = {"tipo": 5, "timestamp_ms": 7800}
PACOTE_FINAL = {"tipo": 3, "timestamp_ms": 30000, "sucesso": True, "v_med": 10.0, "bateria": 85}


# =========================================================================
# Identificação de tipo
# =========================================================================

class TestIdentificarTiposNovos:
    def test_heartbeat_identificado(self):
        assert identificar_tipo_pacote(PACOTE_HEARTBEAT) == TipoPacote.HEARTBEAT

    def test_alerta_temperatura_identificado(self):
        assert identificar_tipo_pacote(PACOTE_TEMP) == TipoPacote.ALERTA_TEMPERATURA


# =========================================================================
# Validação de Heartbeat
# =========================================================================

class TestValidarHeartbeat:
    def test_heartbeat_valido(self):
        assert validar_pacote(PACOTE_HEARTBEAT, TipoPacote.HEARTBEAT).valido

    def test_heartbeat_sem_bateria_rejeitado(self):
        r = validar_pacote({"tipo": 4, "timestamp_ms": 1000}, TipoPacote.HEARTBEAT)
        assert not r.valido and any("bateria" in e for e in r.erros)

    def test_heartbeat_bateria_float_rejeitado(self):
        r = validar_pacote({"tipo": 4, "timestamp_ms": 1000, "bateria": 90.5}, TipoPacote.HEARTBEAT)
        assert not r.valido and any("inteiro" in e for e in r.erros)

    def test_heartbeat_bateria_fora_do_range(self):
        r = validar_pacote({"tipo": 4, "timestamp_ms": 1000, "bateria": 150}, TipoPacote.HEARTBEAT)
        assert not r.valido and any("range" in e for e in r.erros)

    def test_heartbeat_sem_timestamp(self):
        r = validar_pacote({"tipo": 4, "bateria": 80}, TipoPacote.HEARTBEAT)
        assert not r.valido and any("timestamp_ms" in e for e in r.erros)


# =========================================================================
# Validação de AlertaTemperatura
# =========================================================================

class TestValidarAlertaTemperatura:
    def test_alerta_temperatura_valido(self):
        assert validar_pacote(PACOTE_TEMP, TipoPacote.ALERTA_TEMPERATURA).valido

    def test_alerta_temperatura_sem_temp_c(self):
        r = validar_pacote(PACOTE_TEMP_SEM_CAMPO, TipoPacote.ALERTA_TEMPERATURA)
        assert not r.valido and any("temp_c" in e for e in r.erros)

    def test_alerta_temperatura_temp_c_string(self):
        r = validar_pacote({"tipo": 5, "timestamp_ms": 100, "temp_c": "quente"}, TipoPacote.ALERTA_TEMPERATURA)
        assert not r.valido

    def test_alerta_temperatura_temp_c_int_aceito(self):
        # int é aceito (isinstance(61, (int, float)) == True)
        assert validar_pacote({"tipo": 5, "timestamp_ms": 100, "temp_c": 61}, TipoPacote.ALERTA_TEMPERATURA).valido


# =========================================================================
# Processamento de Heartbeat (service)
# =========================================================================

class TestProcessarHeartbeat:
    def test_heartbeat_atualiza_bateria(self):
        e = atualizar_indicadores(criar_estado_inicial(), PACOTE_INICIAL)
        e = atualizar_indicadores(e, PACOTE_HEARTBEAT)
        assert e.bateria_atual == 93

    def test_heartbeat_atualiza_timestamp(self):
        e = atualizar_indicadores(criar_estado_inicial(), PACOTE_INICIAL)
        e = atualizar_indicadores(e, PACOTE_HEARTBEAT)
        assert e.ultimo_timestamp_ms == 1500

    def test_heartbeat_nao_muda_status_corrida(self):
        e = atualizar_indicadores(criar_estado_inicial(), PACOTE_INICIAL)
        e = atualizar_indicadores(e, PACOTE_HEARTBEAT)
        assert e.status_corrida == StatusCorridaTelemetria.EM_ANDAMENTO

    def test_heartbeat_bateria_critica_ativa_alerta(self):
        e = atualizar_indicadores(criar_estado_inicial(), PACOTE_INICIAL)
        e = atualizar_indicadores(e, PACOTE_HEARTBEAT_CRITICA)
        assert e.alerta_bateria_critica
        assert e.log_alertas[-1].tipo == TipoAlertaTelemetria.BATERIA_CRITICA

    def test_heartbeat_invalido_sem_sessao_nao_altera(self):
        e = criar_estado_inicial()
        e2 = atualizar_indicadores(e, PACOTE_HEARTBEAT)
        # sem sessão ativa, heartbeat é pacote válido — apenas atualiza ts/bateria
        assert e2.bateria_atual == 93


# =========================================================================
# Processamento de AlertaTemperatura (service)
# =========================================================================

class TestProcessarAlertaTemperatura:
    def test_alerta_temperatura_aborta_corrida(self):
        e = atualizar_indicadores(criar_estado_inicial(), PACOTE_INICIAL)
        e = atualizar_indicadores(e, PACOTE_TEMP)
        assert e.status_corrida == StatusCorridaTelemetria.FALHA
        assert e.sucesso is False

    def test_alerta_temperatura_registra_log(self):
        e = atualizar_indicadores(criar_estado_inicial(), PACOTE_INICIAL)
        e = atualizar_indicadores(e, PACOTE_TEMP)
        assert any(a.tipo == TipoAlertaTelemetria.TEMPERATURA_CRITICA for a in e.log_alertas)

    def test_alerta_temperatura_seta_flag(self):
        e = atualizar_indicadores(criar_estado_inicial(), PACOTE_INICIAL)
        e = atualizar_indicadores(e, PACOTE_TEMP)
        assert e.alerta_temperatura_critica

    def test_alerta_temperatura_fixa_tempo(self):
        e = atualizar_indicadores(criar_estado_inicial(), PACOTE_INICIAL)
        e = atualizar_indicadores(e, PACOTE_TEMP)
        assert e.tempo_final_ms == PACOTE_TEMP["timestamp_ms"]

    def test_alerta_temperatura_nao_aborta_corrida_ja_encerrada(self):
        e = atualizar_indicadores(criar_estado_inicial(), PACOTE_INICIAL)
        e = atualizar_indicadores(e, PACOTE_FINAL)
        assert e.status_corrida == StatusCorridaTelemetria.CONCLUIDA
        e2 = atualizar_indicadores(e, PACOTE_TEMP)
        # Não deve mudar o status de CONCLUIDA para FALHA
        assert e2.status_corrida == StatusCorridaTelemetria.CONCLUIDA


# =========================================================================
# Integração via HTTP (router)
# =========================================================================

class TestHeartbeatRouter:
    def test_heartbeat_retorna_201(self, client: TestClient):
        client.post("/api/telemetria/pacote", json=PACOTE_INICIAL)
        r = client.post("/api/telemetria/pacote", json=PACOTE_HEARTBEAT)
        assert r.status_code == 201

    def test_heartbeat_sem_sessao_retorna_409(self, client: TestClient):
        r = client.post("/api/telemetria/pacote", json=PACOTE_HEARTBEAT)
        assert r.status_code == 409

    def test_heartbeat_atualiza_bateria_no_estado(self, client: TestClient):
        client.post("/api/telemetria/pacote", json=PACOTE_INICIAL)
        r = client.post("/api/telemetria/pacote", json=PACOTE_HEARTBEAT)
        assert r.json()["estado"]["bateria_atual"] == 93

    def test_heartbeat_persiste_alerta_bateria_critica(self, client: TestClient, session: Session):
        idb = client.post("/api/telemetria/pacote", json=PACOTE_INICIAL).json()["estado"]["id_corrida_banco"]
        client.post("/api/telemetria/pacote", json=PACOTE_HEARTBEAT_CRITICA)
        eventos = list(session.exec(select(Evento).where(Evento.id_corrida == idb)))
        assert any(e.tipo_evento == "bateria_critica" for e in eventos)


class TestAlertaTemperaturaRouter:
    def test_alerta_temperatura_retorna_201(self, client: TestClient):
        client.post("/api/telemetria/pacote", json=PACOTE_INICIAL)
        r = client.post("/api/telemetria/pacote", json=PACOTE_TEMP)
        assert r.status_code == 201

    def test_alerta_temperatura_encerra_sessao_em_memoria(self, client: TestClient):
        client.post("/api/telemetria/pacote", json=PACOTE_INICIAL)
        client.post("/api/telemetria/pacote", json=PACOTE_TEMP)
        assert _get_id_corrida_atual() is None

    def test_alerta_temperatura_sem_sessao_retorna_409(self, client: TestClient):
        r = client.post("/api/telemetria/pacote", json=PACOTE_TEMP)
        assert r.status_code == 409

    def test_alerta_temperatura_marca_corrida_como_abortada_no_banco(self, client: TestClient, session: Session):
        idb = client.post("/api/telemetria/pacote", json=PACOTE_INICIAL).json()["estado"]["id_corrida_banco"]
        client.post("/api/telemetria/pacote", json=PACOTE_TEMP)
        corrida = session.get(Corrida, idb)
        assert corrida.status_corrida == StatusCorrida.ABORTADA

    def test_alerta_temperatura_persiste_evento_no_banco(self, client: TestClient, session: Session):
        idb = client.post("/api/telemetria/pacote", json=PACOTE_INICIAL).json()["estado"]["id_corrida_banco"]
        client.post("/api/telemetria/pacote", json=PACOTE_TEMP)
        eventos = list(session.exec(select(Evento).where(Evento.id_corrida == idb)))
        assert any(e.tipo_evento == "temperatura_critica" for e in eventos)

    def test_alerta_temperatura_sem_temp_c_retorna_422(self, client: TestClient):
        client.post("/api/telemetria/pacote", json=PACOTE_INICIAL)
        r = client.post("/api/telemetria/pacote", json=PACOTE_TEMP_SEM_CAMPO)
        assert r.status_code == 422
