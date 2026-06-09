"""7.6 Testes de integração — Sistemas externos ao Web.

Simula o firmware ESP32 como sistema externo, enviando pacotes HTTP
conforme o contrato telemetria.md (raiz do projeto).

A função test_cenario_corridas_sequenciais executa uma sequência
realista de corridas (sucesso, falha, aborto por temperatura, heartbeats)
dentro de um ÚNICO teste, acumulando estado no banco sem limpá-lo.

Rastreabilidade:
  HU-08  Recepção de Dados
  HU-09  Monitoramento (online/offline)
  HU-10  Validação
  HU-14  Status do Desafio
  HU-16  Registro de Dados Finais
  HU-20  Comunicação com Micromouse
  CT-S01, CT-S02, CT-S05, CT-SE11   
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models.corrida import Corrida
from app.models.labirinto import Labirinto
from app.models.percurso import Percurso
from app.models.evento import Evento
from app.models.enums import StatusCorrida, TipoLabirinto


# ======================================================================
# Helpers — pacotes de telemetria
# ======================================================================

def pkt_inicial(dimensao=4, bateria=100):
    return {"tipo": 0, "timestamp_ms": 0, "dimensao": dimensao, "bateria": bateria}

def pkt_mov(ts, x, y, w):
    return {"tipo": 1, "timestamp_ms": ts, "x": x, "y": y, "w": w}

def pkt_rota(ts, rota):
    return {"tipo": 2, "timestamp_ms": ts, "rota": rota}

def pkt_final(ts, sucesso, v_med, bateria):
    return {"tipo": 3, "timestamp_ms": ts, "sucesso": sucesso,
            "v_med": v_med, "bateria": bateria}

def pkt_heartbeat(ts, bateria):
    return {"tipo": 4, "timestamp_ms": ts, "bateria": bateria}

def pkt_temp(ts, temp_c):
    return {"tipo": 5, "timestamp_ms": ts, "temp_c": temp_c}

def post(client, pkt):
    return client.post("/api/telemetria/pacote", json=pkt)


def _drain_ws(ws, count):
    """Consome um número específico de mensagens do WebSocket, retornando a última."""
    msg = None
    for _ in range(count):
        msg = ws.receive_json()
    return msg


# ======================================================================
# CENÁRIO PRINCIPAL — Corridas sequenciais sem limpar banco
# ======================================================================

def test_cenario_corridas_sequenciais(client: TestClient, session: Session):
    """Simula sessão realista: várias corridas consecutivas,
    acumulando estado no banco. Cada corrida é uma etapa do teste.
    """

    ids_corridas = []

    # ------------------------------------------------------------------
    # Corrida 1: Sucesso completo num labirinto 4×4
    # ------------------------------------------------------------------
    r = post(client, pkt_inicial(dimensao=4, bateria=100))
    assert r.status_code == 201
    idb1 = r.json()["estado"]["id_corrida_banco"]
    assert idb1 is not None

    corrida = session.get(Corrida, idb1)
    assert corrida.status_corrida == StatusCorrida.EM_ANDAMENTO
    lab = session.get(Labirinto, corrida.id_labirinto)
    assert lab.tipo_labirinto == TipoLabirinto.QUATRO

    # Heartbeat intercalado (tipo=4)
    r = post(client, pkt_heartbeat(500, 99))
    assert r.status_code == 201
    assert r.json()["estado"]["bateria_atual"] == 99

    # Movimentação — exploração de 5 células (tipo=1)
    for ts, x, y, w in [(1000,0,0,11), (2000,1,0,6), (3000,1,1,5),
                         (4000,2,1,3), (5000,2,2,0)]:
        r = post(client, pkt_mov(ts, x, y, w))
        assert r.status_code == 201

    percursos = session.exec(
        select(Percurso).where(Percurso.id_corrida == idb1)
    ).all()
    assert len(percursos) == 5

    # Outro heartbeat
    r = post(client, pkt_heartbeat(5500, 96))
    assert r.status_code == 201

    # Rota otimizada (tipo=2)
    rota = [[0,0], [1,0], [1,1], [2,1], [2,2]]
    r = post(client, pkt_rota(6000, rota))
    assert r.status_code == 201

    # Fim de Corrida — sucesso (tipo=3)
    r = post(client, pkt_final(10000, True, 0.22, 88))
    assert r.status_code == 201
    assert r.json()["estado"]["sucesso"] is True
    assert r.json()["estado"]["status_corrida"] == "concluida"

    session.expire_all()
    corrida = session.get(Corrida, idb1)
    assert corrida.status_corrida == StatusCorrida.CONCLUIDA
    assert corrida.desafio_cumprido is True
    assert corrida.tempo_total == 10000
    assert corrida.velocidade_media == 0.22
    assert corrida.bateria_inicial == 100
    ids_corridas.append(idb1)

    # ------------------------------------------------------------------
    # Corrida 2: Falha (robô não atingiu objetivo) num 8×8
    # HU-14 (CA-14-03), HU-16
    # ------------------------------------------------------------------
    r = post(client, pkt_inicial(dimensao=8, bateria=95))
    assert r.status_code == 201
    idb2 = r.json()["estado"]["id_corrida_banco"]

    session.expire_all()
    lab = session.get(Labirinto, session.get(Corrida, idb2).id_labirinto)
    assert lab.tipo_labirinto == TipoLabirinto.OITO

    for i, (x, y, w) in enumerate([(0,0,9), (0,1,1), (1,1,4)]):
        r = post(client, pkt_mov(1000*(i+1), x, y, w))
        assert r.status_code == 201

    r = post(client, pkt_final(8000, False, 0.10, 92))
    assert r.status_code == 201

    session.expire_all()
    corrida = session.get(Corrida, idb2)
    assert corrida.status_corrida == StatusCorrida.CONCLUIDA
    assert corrida.desafio_cumprido is False
    assert corrida.velocidade_media == 0.10
    ids_corridas.append(idb2)

    # ------------------------------------------------------------------
    # Corrida 3: Abortada por alerta de temperatura crítica (16×16)
    # HU-10, HU-16
    # ------------------------------------------------------------------
    r = post(client, pkt_inicial(dimensao=16, bateria=100))
    assert r.status_code == 201
    idb3 = r.json()["estado"]["id_corrida_banco"]

    session.expire_all()
    lab = session.get(Labirinto, session.get(Corrida, idb3).id_labirinto)
    assert lab.tipo_labirinto == TipoLabirinto.DEZESSEIS

    post(client, pkt_mov(1000, 0, 0, 15))
    post(client, pkt_mov(2000, 1, 0, 5))

    r = post(client, pkt_temp(3000, 61.0))
    assert r.status_code == 201

    session.expire_all()
    corrida = session.get(Corrida, idb3)
    assert corrida.status_corrida == StatusCorrida.ABORTADA

    eventos = list(session.exec(
        select(Evento).where(Evento.id_corrida == idb3)
    ).all())
    assert any(e.tipo_evento == "temperatura_critica" for e in eventos)
    ids_corridas.append(idb3)

    # ------------------------------------------------------------------
    # Corrida 4: Sucesso com bateria crítica (alerta persistido)
    # HU-15 (CA-15-01)
    # ------------------------------------------------------------------
    r = post(client, pkt_inicial(dimensao=4, bateria=10))
    assert r.status_code == 201
    idb4 = r.json()["estado"]["id_corrida_banco"]
    assert r.json()["estado"]["alerta_bateria_critica"] is True

    session.expire_all()
    eventos = list(session.exec(
        select(Evento).where(Evento.id_corrida == idb4)
    ).all())
    assert any(e.tipo_evento == "bateria_critica" for e in eventos)

    post(client, pkt_mov(1000, 0, 0, 0))
    r = post(client, pkt_final(5000, True, 0.15, 3))
    assert r.status_code == 201

    session.expire_all()
    corrida = session.get(Corrida, idb4)
    assert corrida.desafio_cumprido is True
    ids_corridas.append(idb4)

    # ------------------------------------------------------------------
    # Corrida 5: Sessão sobrescrita (tipo=0 sobre sessão ativa)
    # ------------------------------------------------------------------
    r1 = post(client, pkt_inicial(dimensao=8, bateria=90))
    idb5a = r1.json()["estado"]["id_corrida_banco"]
    post(client, pkt_mov(1000, 0, 0, 0))

    # Inicia nova corrida SEM encerrar a anterior → anterior ABORTADA
    r2 = post(client, pkt_inicial(dimensao=4, bateria=85))
    idb5b = r2.json()["estado"]["id_corrida_banco"]

    session.expire_all()
    corrida_a = session.get(Corrida, idb5a)
    assert corrida_a.status_corrida == StatusCorrida.ABORTADA

    r = post(client, pkt_final(3000, True, 0.30, 80))
    assert r.status_code == 201

    session.expire_all()
    corrida_b = session.get(Corrida, idb5b)
    assert corrida_b.status_corrida == StatusCorrida.CONCLUIDA
    ids_corridas.append(idb5a)
    ids_corridas.append(idb5b)

    # ------------------------------------------------------------------
    # Verificação final: estado acumulado do banco
    # ------------------------------------------------------------------
    session.expire_all()
    todas = session.exec(select(Corrida)).all()
    assert len(todas) == 6  # 1+2+3+4+5A+5B

    concluidas = [c for c in todas if c.status_corrida == StatusCorrida.CONCLUIDA]
    abortadas = [c for c in todas if c.status_corrida == StatusCorrida.ABORTADA]
    assert len(concluidas) == 4   # corridas 1, 2, 4, 5B
    assert len(abortadas) == 2    # corridas 3 (temp), 5A (sobrescrita)

    com_desafio = [c for c in concluidas if c.desafio_cumprido is True]
    sem_desafio = [c for c in concluidas if c.desafio_cumprido is False]
    assert len(com_desafio) == 3  # corridas 1, 4, 5B
    assert len(sem_desafio) == 1  # corrida 2

    total_percursos = len(session.exec(select(Percurso)).all())
    assert total_percursos >= 10

    total_eventos = len(session.exec(select(Evento)).all())
    assert total_eventos >= 2  # bateria_critica + temperatura_critica

    labs = session.exec(select(Labirinto)).all()
    tipos = {l.tipo_labirinto for l in labs}
    assert TipoLabirinto.QUATRO in tipos
    assert TipoLabirinto.OITO in tipos
    assert TipoLabirinto.DEZESSEIS in tipos


# ======================================================================
# Validação do contrato JSON
# ======================================================================

class TestContratoTelemetriaMd:
    """Valida que o backend aceita exatamente os formatos do telemetria.md
    e rejeita variações."""

    # --- tipo=0 ---
    def test_tipo0_conforme_contrato(self, client):
        r = post(client, {"tipo": 0, "timestamp_ms": 0, "dimensao": 4, "bateria": 100})
        assert r.status_code == 201

    @pytest.mark.parametrize("dimensao", [1, 2, 3, 5, 6, 7, 9, 10, 32])
    def test_tipo0_dimensao_invalida(self, client, dimensao):
        r = post(client, {"tipo": 0, "timestamp_ms": 0, "dimensao": dimensao, "bateria": 100})
        assert r.status_code == 422

    def test_tipo0_sem_dimensao(self, client):
        r = post(client, {"tipo": 0, "timestamp_ms": 0, "bateria": 100})
        assert r.status_code == 422

    def test_tipo0_sem_bateria(self, client):
        r = post(client, {"tipo": 0, "timestamp_ms": 0, "dimensao": 4})
        assert r.status_code == 422

    # --- tipo=1 ---
    def test_tipo1_conforme_contrato(self, client):
        post(client, pkt_inicial())
        r = post(client, {"tipo": 1, "timestamp_ms": 1234, "x": 2, "y": 1, "w": 5})
        assert r.status_code == 201

    @pytest.mark.parametrize("w", range(0, 16))
    def test_tipo1_bitmask_0_a_15_valido(self, client, w):
        post(client, pkt_inicial())
        r = post(client, {"tipo": 1, "timestamp_ms": 1000, "x": 0, "y": 0, "w": w})
        assert r.status_code == 201

    @pytest.mark.parametrize("w_inv", [16, -1, 255])
    def test_tipo1_bitmask_invalido(self, client, w_inv):
        post(client, pkt_inicial())
        r = post(client, {"tipo": 1, "timestamp_ms": 1000, "x": 0, "y": 0, "w": w_inv})
        assert r.status_code == 422

    def test_tipo1_sem_w(self, client):
        post(client, pkt_inicial())
        r = post(client, {"tipo": 1, "timestamp_ms": 1000, "x": 0, "y": 0})
        assert r.status_code == 422

    def test_tipo1_sem_x(self, client):
        post(client, pkt_inicial())
        r = post(client, {"tipo": 1, "timestamp_ms": 1000, "y": 0, "w": 0})
        assert r.status_code == 422

    # --- tipo=2 ---
    def test_tipo2_conforme_contrato(self, client):
        post(client, pkt_inicial())
        r = post(client, {"tipo": 2, "timestamp_ms": 9000, "rota": [[0,0],[0,1],[1,1]]})
        assert r.status_code == 201

    # --- tipo=3 ---
    def test_tipo3_conforme_contrato(self, client):
        post(client, pkt_inicial())
        r = post(client, {"tipo": 3, "timestamp_ms": 14250, "sucesso": True,
                          "v_med": 0.22, "bateria": 88})
        assert r.status_code == 201

    def test_tipo3_sucesso_nao_booleano(self, client):
        post(client, pkt_inicial())
        r = post(client, {"tipo": 3, "timestamp_ms": 14250, "sucesso": "sim",
                          "v_med": 0.22, "bateria": 88})
        assert r.status_code == 422

    def test_tipo3_sem_v_med(self, client):
        post(client, pkt_inicial())
        r = post(client, {"tipo": 3, "timestamp_ms": 14250, "sucesso": True, "bateria": 88})
        assert r.status_code == 422

    # --- tipo=4 ---
    def test_tipo4_conforme_contrato(self, client):
        post(client, pkt_inicial())
        r = post(client, {"tipo": 4, "timestamp_ms": 5000, "bateria": 95})
        assert r.status_code == 201

    def test_tipo4_sem_bateria(self, client):
        post(client, pkt_inicial())
        r = post(client, {"tipo": 4, "timestamp_ms": 5000})
        assert r.status_code == 422

    # --- tipo=5 ---
    def test_tipo5_conforme_contrato(self, client):
        post(client, pkt_inicial())
        r = post(client, {"tipo": 5, "timestamp_ms": 7800, "temp_c": 61.0})
        assert r.status_code == 201

    def test_tipo5_sem_temp_c(self, client):
        post(client, pkt_inicial())
        r = post(client, {"tipo": 5, "timestamp_ms": 7800})
        assert r.status_code == 422

    # --- inválidos ---
    def test_tipo_desconhecido(self, client):
        r = post(client, {"tipo": 99, "timestamp_ms": 0})
        assert r.status_code == 422

    def test_pacote_vazio(self, client):
        r = post(client, {})
        assert r.status_code == 422


# ======================================================================
# Cenários adversos de comunicação
# ======================================================================

class TestCenariosAdversos:
    """Valida resiliência do backend a falhas de comunicação do firmware."""

    def test_pacote_sem_sessao_ativa_retorna_409(self, client):
        r = post(client, pkt_mov(1000, 0, 0, 0))
        assert r.status_code == 409

    def test_heartbeat_sem_sessao_retorna_409(self, client):
        r = post(client, pkt_heartbeat(1000, 90))
        assert r.status_code == 409

    def test_timestamp_regressivo_rejeitado(self, client):
        post(client, pkt_inicial())
        post(client, pkt_mov(5000, 0, 0, 0))
        r = post(client, pkt_mov(3000, 1, 0, 0))
        assert r.status_code == 422
        assert "regressivo" in str(r.json()["detail"]["erros"]).lower()

    def test_timestamp_negativo_rejeitado(self, client):
        r = post(client, {"tipo": 0, "timestamp_ms": -1, "dimensao": 4, "bateria": 100})
        assert r.status_code == 422

    def test_bateria_acima_de_100(self, client):
        r = post(client, {"tipo": 0, "timestamp_ms": 0, "dimensao": 4, "bateria": 150})
        assert r.status_code == 422

    def test_bateria_negativa(self, client):
        r = post(client, {"tipo": 0, "timestamp_ms": 0, "dimensao": 4, "bateria": -5})
        assert r.status_code == 422


# ======================================================================
# Broadcast WebSocket por tipo de pacote
# ======================================================================

class TestBroadcastWebSocket:
    """Valida que cada tipo de pacote gera o evento WebSocket correto."""

    @staticmethod
    def _collect_until(ws, target_type, max_msgs=5):
        """Lê mensagens do WS até encontrar o tipo desejado ou esgotar o limite."""
        collected = []
        for _ in range(max_msgs):
            msg = ws.receive_json()
            collected.append(msg)
            if msg.get("type") == target_type:
                return collected
        return collected

    def test_tipo0_broadcast_sessao_iniciada(self, client):
        with client.websocket_connect("/api/telemetria/ws") as ws:
            ws.receive_json()  # HANDSHAKE
            post(client, pkt_inicial(dimensao=4, bateria=100))
            msgs = self._collect_until(ws, "SESSAO_INICIADA")
            sessao_msg = next(m for m in msgs if m["type"] == "SESSAO_INICIADA")
            assert sessao_msg["data"]["dimensao"] == "4X4"
            assert sessao_msg["data"]["bateria_inicial"] == 100

    def test_tipo1_broadcast_movimentacao(self, client):
        with client.websocket_connect("/api/telemetria/ws") as ws:
            ws.receive_json()  # HANDSHAKE
            post(client, pkt_inicial())
            self._collect_until(ws, "SESSAO_INICIADA")

            post(client, pkt_mov(1000, 2, 1, 5))
            msgs = self._collect_until(ws, "ATUALIZACAO_TELEMETRIA")
            types = [m["type"] for m in msgs]
            assert "MOVIMENTACAO" in types
            assert "ATUALIZACAO_TELEMETRIA" in types
            mov_msg = next(m for m in msgs if m["type"] == "MOVIMENTACAO")
            assert mov_msg["data"]["x"] == 2
            assert mov_msg["data"]["y"] == 1
            assert mov_msg["data"]["w"] == 5

    def test_tipo4_broadcast_heartbeat(self, client):
        with client.websocket_connect("/api/telemetria/ws") as ws:
            ws.receive_json()  # HANDSHAKE
            post(client, pkt_inicial())
            self._collect_until(ws, "SESSAO_INICIADA")

            post(client, pkt_heartbeat(1500, 93))
            msgs = self._collect_until(ws, "HEARTBEAT")
            hb_msg = next(m for m in msgs if m["type"] == "HEARTBEAT")
            assert hb_msg["data"]["bateria_atual"] == 93

    def test_tipo5_broadcast_alerta_temperatura(self, client):
        with client.websocket_connect("/api/telemetria/ws") as ws:
            ws.receive_json()  # HANDSHAKE
            post(client, pkt_inicial())
            self._collect_until(ws, "SESSAO_INICIADA")

            post(client, pkt_temp(7800, 61.0))
            msgs = self._collect_until(ws, "ALERTA_TEMPERATURA_CRITICA")
            temp_msg = next(m for m in msgs if m["type"] == "ALERTA_TEMPERATURA_CRITICA")
            assert temp_msg["data"]["temp_c"] == 61.0


# ======================================================================
# Dimensões do labirinto
# ======================================================================

class TestDimensoesLabirinto:
    """Valida que apenas 4, 8, 16 são aceitas e mapeiam corretamente."""

    @pytest.mark.parametrize("dim,tipo_esperado", [
        (4, TipoLabirinto.QUATRO),
        (8, TipoLabirinto.OITO),
        (16, TipoLabirinto.DEZESSEIS),
    ])
    def test_dimensao_valida_cria_labirinto_correto(self, client, session, dim, tipo_esperado):
        r = post(client, pkt_inicial(dimensao=dim))
        assert r.status_code == 201
        idb = r.json()["estado"]["id_corrida_banco"]
        corrida = session.get(Corrida, idb)
        lab = session.get(Labirinto, corrida.id_labirinto)
        assert lab.tipo_labirinto == tipo_esperado
