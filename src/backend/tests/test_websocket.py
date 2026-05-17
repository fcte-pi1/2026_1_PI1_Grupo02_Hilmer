import pytest
from fastapi.testclient import TestClient

def test_websocket_connection(client:TestClient):
    with client.websocket_connect("/api/telemetria/ws") as websocket:
        message = websocket.receive_json()
        assert message == {"message": "connected"}

def test_telemetry_post_endpoint(client:TestClient):
    response = client.post("/api/telemetria/pacote", json={
        "id_corrida": 1,
        "timestamp_ms": 1000,
        "dimensao": 4,
        "tentativa": 1,
        "bateria": 100
    })
    assert response.status_code == 201
    assert response.json()["message"] == "Pacote processado com sucesso"

def test_websocket_message_delivery(client:TestClient):
    with client.websocket_connect("/api/telemetria/ws") as websocket:
        msg_conexao = websocket.receive_json()
        assert msg_conexao == {"message": "connected"}
        
        # Enviamos um pacote de telemetria
        response = client.post("/api/telemetria/pacote", json={
            "id_corrida": 1,
            "timestamp_ms": 1000,
            "dimensao": 4,
            "tentativa": 1,
            "bateria": 100
        })
        assert response.status_code == 201

        # Recebemos a mensagem enviada pelo WebSocket manager
        message = websocket.receive_json()
        
        # Valida os dados reais transmitidos
        assert message["type"] == "SESSAO_INICIADA"
        assert message["data"]["id_corrida_banco"] is not None
        assert message["data"]["bateria_inicial"] == 100.0
        assert message["data"]["dimensao"] == "4X4"