from fastapi.testclient import TestClient
from sqlmodel import Session, select
from app.models.evento import Evento
from app.routers.telemetria import _get_id_corrida_atual
import app.routers.telemetria as _tel_router
from app.schemas.telemetria import StatusCorridaTelemetria


def _buscar_eventos(session, id_corrida):
    return list(session.exec(select(Evento).where(Evento.id_corrida == id_corrida).order_by(Evento.id_evento)))


def test_alerta_bateria_critica_e_persistido(client: TestClient, session: Session):
    r = client.post("/api/telemetria/pacote", json={"tipo": 0, "timestamp_ms": 0, "dimensao": 4, "bateria": 10})
    assert r.status_code == 201
    estado = r.json()["estado"]
    assert estado["alerta_bateria_critica"] and estado["log_alertas"][0]["tipo"] == "bateria_critica"
    eventos = _buscar_eventos(session, estado["id_corrida_banco"])
    assert len(eventos) == 1 and eventos[0].tipo_evento == "bateria_critica"


def test_alerta_parada_inesperada_e_persistido(client: TestClient, session: Session):
    r0 = client.post("/api/telemetria/pacote", json={"tipo": 0, "timestamp_ms": 0, "dimensao": 4, "bateria": 85})
    idb = r0.json()["estado"]["id_corrida_banco"]
    for p in (
        {"tipo": 1, "timestamp_ms": 1000, "x": 0, "y": 0, "w": 0},
        {"tipo": 1, "timestamp_ms": 2500, "x": 0, "y": 0, "w": 0},
        {"tipo": 1, "timestamp_ms": 4501, "x": 0, "y": 0, "w": 0},
    ):
        r = client.post("/api/telemetria/pacote", json=p)
        assert r.status_code == 201
    estado = r.json()["estado"]
    assert estado["alerta_possivel_parada_inesperada"]
    eventos = _buscar_eventos(session, idb)
    assert len(eventos) == 1 and eventos[0].tipo_evento == "possivel_parada_inesperada"


def test_alerta_de_parada_nao_dispara_fora_de_corrida_ativa(client: TestClient, session: Session):
    for status in (StatusCorridaTelemetria.AGUARDANDO, StatusCorridaTelemetria.FALHA, StatusCorridaTelemetria.CONCLUIDA):
        r0 = client.post("/api/telemetria/pacote", json={"tipo": 0, "timestamp_ms": 0, "dimensao": 4, "bateria": 85})
        idb = r0.json()["estado"]["id_corrida_banco"]
        # Manipular o estado em memória para simular corrida fora de andamento
        _tel_router._estado_atual.status_corrida = status
        for p in (
            {"tipo": 1, "timestamp_ms": 1000, "x": 0, "y": 0, "w": 0},
            {"tipo": 1, "timestamp_ms": 5000, "x": 0, "y": 0, "w": 0},
        ):
            r = client.post("/api/telemetria/pacote", json=p)
            assert r.status_code == 201
        estado = r.json()["estado"]
        assert not estado["alerta_possivel_parada_inesperada"]
        assert not any(e.tipo_evento == "possivel_parada_inesperada" for e in _buscar_eventos(session, idb))
