import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select
from app.models.corrida import Corrida
from app.models.evento import Evento

# ---------------------------------------------------------------------------
# CAMINHO FELIZ
# ---------------------------------------------------------------------------

def test_fluxo_telemetria_completo_sucesso(client: TestClient, session: Session):
    """Garante que o ciclo completo de uma corrida funciona e persiste no banco."""
    id_hw = 999
    
    # 1. Pacote Inicial
    resp_init = client.post("/api/telemetria/pacote", json={
        "id_corrida": id_hw, "timestamp_ms": 100, "dimensao": 16, "tentativa": 1, "bateria": 100.0
    })
    assert resp_init.status_code == 201
    
    # 2. Pacote Movimentação
    resp_mov = client.post("/api/telemetria/pacote", json={
        "id_corrida": id_hw, "timestamp_ms": 2000, "x": 1.5, "y": 2.0, "w": 90.0
    })
    assert resp_mov.status_code == 201
    
    # 3. Pacote Final
    resp_end = client.post("/api/telemetria/pacote", json={
        "id_corrida": id_hw, "timestamp_ms": 5000, "sucesso": True, "v_med": 20.0, "bateria": 95.0
    })
    assert resp_end.status_code == 201
    
    # Verificações no Banco de Dados
    corrida = session.exec(select(Corrida).where(Corrida.sessao_hardware_id == id_hw)).first()
    assert corrida is not None
    assert corrida.bateria_inicial == 100.0
    assert corrida.bateria_final == 95.0
    assert corrida.desafio_cumprido is True

# ---------------------------------------------------------------------------
# CENÁRIOS DE FALHA (HTTP 422) - PARAMETRIZADO
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("nome_caso, payload, erro_esperado", [
    # Regras Gerais
    ("Falta id_corrida", 
     {"timestamp_ms": 100, "dimensao": 4, "tentativa": 1, "bateria": 90}, 
     "Campo 'id_corrida' ausente."),
    
    ("id_corrida não inteiro", 
     {"id_corrida": "abc", "timestamp_ms": 100, "dimensao": 4, "tentativa": 1, "bateria": 90}, 
     "Campo 'id_corrida' deve ser um número inteiro (recebido: abc)."),
    
    ("Timestamp negativo", 
     {"id_corrida": 1, "timestamp_ms": -10, "dimensao": 4, "tentativa": 1, "bateria": 90}, 
     "Campo 'timestamp_ms' não pode ser negativo (recebido: -10)."),

    # Pacote Inicial
    ("Dimensão inválida (5)", 
     {"id_corrida": 1, "timestamp_ms": 0, "dimensao": 5, "tentativa": 1, "bateria": 90}, 
     "Dimensão inválida: deve ser 4, 8 ou 16 (recebido: 5)."),
    
    ("Tentativa fora do limite (4)", 
     {"id_corrida": 1, "timestamp_ms": 0, "dimensao": 4, "tentativa": 4, "bateria": 90}, 
     "Tentativa fora do limite: deve ser 1, 2 ou 3 (recebido: 4)."),
    
    ("Bateria fora do limite (110)", 
     {"id_corrida": 1, "timestamp_ms": 0, "dimensao": 4, "tentativa": 1, "bateria": 110}, 
     "Bateria fora do range [0, 100] (recebido: 110)."),

    # Pacote Final
    ("Sucesso não booleano", 
     {"id_corrida": 1, "timestamp_ms": 1000, "sucesso": "ok", "v_med": 10, "bateria": 80}, 
     "Campo 'sucesso' deve ser booleano (recebido: ok)."),
    
    ("v_med negativo", 
     {"id_corrida": 1, "timestamp_ms": 1000, "sucesso": True, "v_med": -1, "bateria": 80}, 
     "Campo 'v_med' não pode ser negativo (recebido: -1)."),
])
def test_falhas_validacao_barreira(client: TestClient, session: Session, nome_caso, payload, erro_esperado):
    """Garante que a barreira de validação bloqueia dados inválidos e não persiste nada."""
    response = client.post("/api/telemetria/pacote", json=payload)
    
    assert response.status_code == 422
    data = response.json()
    assert data["detail"]["mensagem"] == "Pacote descartado"
    assert any(erro_esperado in e for e in data["detail"]["erros"])
    
    # Garante que não foi criada nenhuma corrida no banco (para IDs novos)
    if "id_corrida" in payload and isinstance(payload["id_corrida"], int):
        corrida = session.exec(select(Corrida).where(Corrida.sessao_hardware_id == payload["id_corrida"])).first()
        assert corrida is None

def test_falha_timestamp_regressivo_isolado(client: TestClient):
    """Valida especificamente a regra de não aceitar tempo voltando."""
    id_sessao = 888
    # Envia pacote inicial em t=5000
    client.post("/api/telemetria/pacote", json={
        "id_corrida": id_sessao, "timestamp_ms": 5000, "dimensao": 4, "tentativa": 1, "bateria": 90
    })
    
    # Envia movimentação em t=4000 (Inválido!)
    payload_regressivo = {
        "id_corrida": id_sessao, "timestamp_ms": 4000, "x": 1, "y": 1, "w": 0
    }
    response = client.post("/api/telemetria/pacote", json=payload_regressivo)
    
    assert response.status_code == 422
    assert "Timestamp regressivo: 4000 < último válido 5000." in response.json()["detail"]["erros"]
