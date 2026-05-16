import pytest
from fastapi.testclient import TestClient

def test_websocket_connection(client:TestClient):
    with client.websocket_connect("/api/ws/dashboard") as websocket:
        message = websocket.receive_json()
        assert message == {"message": "connected"}

def test_telemetry_mock_endpoint(client:TestClient):
    response = client.post("/api/test/mock_telemetria/configuracao", json={
        "id_corrida": 1,
        "timestamp_ms": 1000,
        "dimensao": 4,
        "tentativa": 1,
        "bateria": 100
    })
    assert response.status_code == 201
    assert response.json()["message"] == "Pacote de configuração processado e transmitido com sucesso."

def test_websocket_message_delivery_with_telemetry_mock(client:TestClient):
    with client.websocket_connect("/api/ws/dashboard") as websocket:
        msg_conexao = websocket.receive_json()
        assert msg_conexao == {"message": "connected"}
        # Enviamos um pacote de telemetria mockado
        response = client.post("/api/test/mock_telemetria/configuracao", json={
            "id_corrida": 1,
            "timestamp_ms": 1000,
            "dimensao": 4,
            "tentativa": 1,
            "bateria": 100
        })
        assert response.status_code == 201

        # Recebemos a mensagem enviada pelo WebSocket manager
        message = websocket.receive_json()  # Usando receive_json() e salvando na variável
        # Valida os dados reais transmitidos
        assert message["type"] == "CONFIG_INICIAL"
        assert message["data"]["id_corrida_banco"] is not None
        assert message["data"]["bateria_inicial"] == 100