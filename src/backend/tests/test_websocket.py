import pytest
from fastapi.testclient import TestClient

def test_websocket_connection(client:TestClient):
    with client.websocket_connect("/api/telemetria/ws") as websocket:
        message = websocket.receive_json()
        assert message["type"] == "HANDSHAKE"
        assert message["data"]["status"] == "connected"

def test_telemetry_post_endpoint(client:TestClient):
    response = client.post("/api/telemetria/pacote", json={
        "tipo": 0, "timestamp_ms": 1000, "dimensao": 4, "bateria": 10
    })
    assert response.status_code == 201
    assert response.json()["message"] == "Pacote processado com sucesso"
    assert response.json()["estado"]["alerta_bateria_critica"] is True
    assert response.json()["estado"]["log_alertas"][0]["tipo"] == "bateria_critica"

def test_websocket_message_delivery(client:TestClient):
    with client.websocket_connect("/api/telemetria/ws") as websocket:
        msg_conexao = websocket.receive_json()
        assert msg_conexao["type"] == "HANDSHAKE"

        response = client.post("/api/telemetria/pacote", json={
            "tipo": 0, "timestamp_ms": 1000, "dimensao": 4, "bateria": 100
        })
        assert response.status_code == 201

        msg_conexao_status = websocket.receive_json()
        assert msg_conexao_status["type"] == "CONNECTION_STATUS"
        assert msg_conexao_status["data"]["status"] == "online"

        message = websocket.receive_json()
        assert message["type"] == "SESSAO_INICIADA"
        assert message["data"]["id_corrida_banco"] is not None
        assert message["data"]["bateria_inicial"] == 100
        assert message["data"]["dimensao"] == "4X4"
        assert message["data"]["alerta_possivel_parada_inesperada"] is False
        assert message["data"]["log_alertas"] == []
