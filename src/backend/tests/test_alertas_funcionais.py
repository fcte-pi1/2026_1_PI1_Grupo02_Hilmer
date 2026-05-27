from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models.evento import Evento
from app.routers.telemetria import estados_ativos
from app.schemas.telemetria import StatusCorridaTelemetria


def _buscar_eventos_da_corrida(session: Session, id_corrida: int) -> list[Evento]:
    return list(
        session.exec(
            select(Evento)
            .where(Evento.id_corrida == id_corrida)
            .order_by(Evento.id_evento)
        )
    )


def test_alerta_bateria_critica_e_persistido(client: TestClient, session: Session):
    response = client.post(
        "/api/telemetria/pacote",
        json={
            "id_corrida": 101,
            "timestamp_ms": 0,
            "dimensao": 4,
            "tentativa": 1,
            "bateria": 10,
        },
    )

    assert response.status_code == 201
    estado = response.json()["estado"]
    assert estado["alerta_bateria_critica"] is True
    assert estado["log_alertas"][0]["tipo"] == "bateria_critica"

    eventos = _buscar_eventos_da_corrida(session, estado["id_corrida_banco"])
    assert len(eventos) == 1
    assert eventos[0].tipo_evento == "bateria_critica"
    assert eventos[0].descricao == "Bateria crítica detectada."
    assert eventos[0].timestamp_ms == 0
    assert eventos[0].id_corrida == estado["id_corrida_banco"]


def test_alerta_parada_inesperada_e_persistido(client: TestClient, session: Session):
    response_inicial = client.post(
        "/api/telemetria/pacote",
        json={
            "id_corrida": 202,
            "timestamp_ms": 0,
            "dimensao": 4,
            "tentativa": 1,
            "bateria": 85,
        },
    )
    assert response_inicial.status_code == 201
    id_corrida_banco = response_inicial.json()["estado"]["id_corrida_banco"]

    for pacote in (
        {"id_corrida": 202, "timestamp_ms": 1000, "x": 0, "y": 0, "w": 0},
        {"id_corrida": 202, "timestamp_ms": 2500, "x": 0, "y": 0, "w": 0},
        {"id_corrida": 202, "timestamp_ms": 4501, "x": 0, "y": 0, "w": 0},
    ):
        response = client.post("/api/telemetria/pacote", json=pacote)
        assert response.status_code == 201

    estado = response.json()["estado"]
    assert estado["alerta_possivel_parada_inesperada"] is True
    assert estado["log_alertas"][-1]["tipo"] == "possivel_parada_inesperada"

    eventos = _buscar_eventos_da_corrida(session, id_corrida_banco)
    assert len(eventos) == 1
    assert eventos[0].tipo_evento == "possivel_parada_inesperada"
    assert eventos[0].descricao == "Possível parada inesperada detectada."
    assert eventos[0].timestamp_ms == 4501


def test_alerta_de_parada_nao_dispara_fora_de_corrida_ativa(
    client: TestClient,
    session: Session,
):
    for sessao_hardware_id, status in (
        (301, StatusCorridaTelemetria.AGUARDANDO),
        (302, StatusCorridaTelemetria.FALHA),
        (303, StatusCorridaTelemetria.CONCLUIDA),
    ):
        response_inicial = client.post(
            "/api/telemetria/pacote",
            json={
                "id_corrida": sessao_hardware_id,
                "timestamp_ms": 0,
                "dimensao": 4,
                "tentativa": 1,
                "bateria": 85,
            },
        )
        assert response_inicial.status_code == 201

        estado_inicial = response_inicial.json()["estado"]
        id_corrida_banco = estado_inicial["id_corrida_banco"]
        estados_ativos[sessao_hardware_id].status_corrida = status

        for pacote in (
            {"id_corrida": sessao_hardware_id, "timestamp_ms": 1000, "x": 0, "y": 0, "w": 0},
            {"id_corrida": sessao_hardware_id, "timestamp_ms": 5000, "x": 0, "y": 0, "w": 0},
        ):
            response = client.post("/api/telemetria/pacote", json=pacote)
            assert response.status_code == 201

        estado = response.json()["estado"]
        assert estado["status_corrida"] == status.value
        assert estado["alerta_possivel_parada_inesperada"] is False
        assert not any(
            alerta["tipo"] == "possivel_parada_inesperada"
            for alerta in estado["log_alertas"]
        )

        eventos = _buscar_eventos_da_corrida(session, id_corrida_banco)
        assert not any(
            evento.tipo_evento == "possivel_parada_inesperada"
            for evento in eventos
        )
