"""Testes de persistência — pacotes conforme telemetria.md."""
from datetime import datetime, UTC
import pytest
from sqlmodel import Session, select
from fastapi.testclient import TestClient

from app.models.corrida import Corrida
from app.models.labirinto import Labirinto
from app.models.percurso import Percurso
from app.models.celula import Celula
from app.models.enums import StatusCorrida, TipoLabirinto
from app.schemas.corrida import CorridaStart, CorridaSave, CelulaCreate, PercursoCreate
from app.services.registro import RegistroError, iniciar_corrida, salvar_corrida

PACOTE_INICIAL = {"tipo": 0, "timestamp_ms": 0, "dimensao": 4, "bateria": 100}
PACOTE_MOV_1 = {"tipo": 1, "timestamp_ms": 1000, "x": 1, "y": 0, "w": 0}
PACOTE_MOV_2 = {"tipo": 1, "timestamp_ms": 2000, "x": 2, "y": 0, "w": 0}
PACOTE_ROTA = {"tipo": 2, "timestamp_ms": 3000, "rota": [[0, 0], [1, 0], [2, 0]]}
PACOTE_FINAL = {"tipo": 3, "timestamp_ms": 5000, "sucesso": True, "v_med": 0.25, "bateria": 85}

class TestIniciarCorrida:
    def test_cria_labirinto_e_corrida(self, session: Session):
        corrida = iniciar_corrida(session, CorridaStart(tipo_labirinto=TipoLabirinto.QUATRO, data_hora_inicio=datetime.now(UTC)))
        assert corrida.id_corrida is not None and corrida.status_corrida == StatusCorrida.EM_ANDAMENTO

    def test_labirinto_tem_tipo_correto_4x4(self, session: Session):
        corrida = iniciar_corrida(session, CorridaStart(tipo_labirinto=TipoLabirinto.QUATRO, data_hora_inicio=datetime.now(UTC)))
        lab = session.get(Labirinto, corrida.id_labirinto)
        assert lab.tipo_labirinto == TipoLabirinto.QUATRO

    def test_labirinto_tem_tipo_correto_16x16(self, session: Session):
        corrida = iniciar_corrida(session, CorridaStart(tipo_labirinto=TipoLabirinto.DEZESSEIS, data_hora_inicio=datetime.now(UTC)))
        assert session.get(Labirinto, corrida.id_labirinto).tipo_labirinto == TipoLabirinto.DEZESSEIS

    def test_data_hora_inicio_e_salva(self, session: Session):
        corrida = iniciar_corrida(session, CorridaStart(tipo_labirinto=TipoLabirinto.OITO, data_hora_inicio=datetime.now(UTC)))
        assert corrida.data_hora_inicio is not None

class TestSalvarCorrida:
    def _base(self, session):
        return iniciar_corrida(session, CorridaStart(tipo_labirinto=TipoLabirinto.QUATRO, data_hora_inicio=datetime.now(UTC)))

    def test_salva_campos_basicos(self, session: Session):
        corrida = self._base(session)
        r = salvar_corrida(session, corrida.id_corrida, CorridaSave(tempo_total=5000, velocidade_media=30.0, velocidade_maxima_percurso=55.0, status_corrida=StatusCorrida.CONCLUIDA, desafio_cumprido=True, data_hora_fim=datetime.now(UTC)))
        assert r.tempo_total == 5000 and r.velocidade_media == 30.0 and r.status_corrida == StatusCorrida.CONCLUIDA

    def test_salva_resultado_falha(self, session: Session):
        corrida = self._base(session)
        r = salvar_corrida(session, corrida.id_corrida, CorridaSave(tempo_total=3000, status_corrida=StatusCorrida.CONCLUIDA, desafio_cumprido=False))
        assert r.desafio_cumprido is False

    def test_salva_percurso_via_celulas(self, session: Session):
        corrida = self._base(session)
        celulas = [
            CelulaCreate(coordenada_x=0, coordenada_y=0, parede_norte=False, parede_sul=True, parede_leste=False, parede_oeste=True),
            CelulaCreate(coordenada_x=1, coordenada_y=0, parede_norte=False, parede_sul=True, parede_leste=False, parede_oeste=False),
        ]
        percurso = [PercursoCreate(indice_celula=0, data_hora_passagem=datetime.now(UTC)), PercursoCreate(indice_celula=1, data_hora_passagem=datetime.now(UTC))]
        salvar_corrida(session, corrida.id_corrida, CorridaSave(tempo_total=2000, status_corrida=StatusCorrida.CONCLUIDA, desafio_cumprido=True, celulas=celulas, percurso=percurso))
        assert len(session.exec(select(Percurso).where(Percurso.id_corrida == corrida.id_corrida)).all()) == 2

    def test_tempo_total_negativo_levanta_registro_error(self, session: Session):
        corrida = self._base(session)
        with pytest.raises(RegistroError):
            salvar_corrida(session, corrida.id_corrida, CorridaSave(tempo_total=-1, status_corrida=StatusCorrida.CONCLUIDA, desafio_cumprido=False))

    def test_corrida_inexistente_levanta_registro_error(self, session: Session):
        with pytest.raises(RegistroError):
            salvar_corrida(session, 999999, CorridaSave(tempo_total=1000, status_corrida=StatusCorrida.CONCLUIDA, desafio_cumprido=True))

class TestPersistenciaFluxoTelemetria:
    def test_pacote_inicial_cria_corrida_no_banco(self, client: TestClient, session: Session):
        resp = client.post("/api/telemetria/pacote", json=PACOTE_INICIAL)
        assert resp.status_code == 201
        idb = resp.json()["estado"]["id_corrida_banco"]
        corrida = session.get(Corrida, idb)
        assert corrida is not None and corrida.status_corrida == StatusCorrida.EM_ANDAMENTO
        assert session.get(Labirinto, corrida.id_labirinto).tipo_labirinto == TipoLabirinto.QUATRO

    def test_pacote_movimentacao_registra_percurso(self, client: TestClient, session: Session):
        idb = client.post("/api/telemetria/pacote", json=PACOTE_INICIAL).json()["estado"]["id_corrida_banco"]
        client.post("/api/telemetria/pacote", json=PACOTE_MOV_1)
        client.post("/api/telemetria/pacote", json=PACOTE_MOV_2)
        assert len(session.exec(select(Percurso).where(Percurso.id_corrida == idb)).all()) == 2

    def test_pacote_rota_registra_percurso_otimizado(self, client: TestClient, session: Session):
        idb = client.post("/api/telemetria/pacote", json=PACOTE_INICIAL).json()["estado"]["id_corrida_banco"]
        assert client.post("/api/telemetria/pacote", json=PACOTE_ROTA).status_code == 201
        passos = session.exec(select(Percurso).where(Percurso.id_corrida == idb).order_by(Percurso.id_percurso)).all()
        assert len(passos) == 3
        for i, pt in enumerate(PACOTE_ROTA["rota"]):
            assert passos[i].celula.coordenada_x == pt[0] and passos[i].celula.coordenada_y == pt[1]
            assert passos[i].tipo_percurso == "otimizado"

    def test_percurso_reutiliza_celula_existente(self, client: TestClient, session: Session):
        client.post("/api/telemetria/pacote", json=PACOTE_INICIAL)
        client.post("/api/telemetria/pacote", json=PACOTE_MOV_1)
        client.post("/api/telemetria/pacote", json={**PACOTE_MOV_1, "timestamp_ms": 3000})
        assert len(session.exec(select(Celula).where(Celula.coordenada_x == 1).where(Celula.coordenada_y == 0)).all()) == 1

    def test_movimentacao_persiste_paredes_decodificadas(self, client: TestClient, session: Session):
        # w=5 → Norte (bit 0) + Leste (bit 2), conforme telemetria.md
        client.post("/api/telemetria/pacote", json=PACOTE_INICIAL)
        client.post("/api/telemetria/pacote", json={**PACOTE_MOV_1, "w": 5})
        celula = session.exec(
            select(Celula).where(Celula.coordenada_x == 1).where(Celula.coordenada_y == 0)
        ).first()
        assert celula is not None
        assert celula.parede_norte is True and celula.parede_leste is True
        assert celula.parede_sul is False and celula.parede_oeste is False

    def test_pacote_final_salva_tempo_total(self, client: TestClient, session: Session):
        idb = client.post("/api/telemetria/pacote", json=PACOTE_INICIAL).json()["estado"]["id_corrida_banco"]
        client.post("/api/telemetria/pacote", json=PACOTE_FINAL)
        assert session.get(Corrida, idb).tempo_total == PACOTE_FINAL["timestamp_ms"]

    def test_pacote_final_salva_resultado_desafio(self, client: TestClient, session: Session):
        idb = client.post("/api/telemetria/pacote", json=PACOTE_INICIAL).json()["estado"]["id_corrida_banco"]
        client.post("/api/telemetria/pacote", json=PACOTE_FINAL)
        c = session.get(Corrida, idb)
        assert c.desafio_cumprido is True and c.status_corrida == StatusCorrida.CONCLUIDA

    def test_pacote_final_falha_salva_status_correto(self, client: TestClient, session: Session):
        idb = client.post("/api/telemetria/pacote", json=PACOTE_INICIAL).json()["estado"]["id_corrida_banco"]
        client.post("/api/telemetria/pacote", json={**PACOTE_FINAL, "sucesso": False})
        c = session.get(Corrida, idb)
        assert c.desafio_cumprido is False and c.status_corrida == StatusCorrida.CONCLUIDA

    def test_pacote_invalido_nao_persiste(self, client: TestClient, session: Session):
        assert client.post("/api/telemetria/pacote", json={"foo": "bar"}).status_code == 422

    def test_corrida_conclui_com_velocidade_media_do_firmware(self, client: TestClient, session: Session):
        idb = client.post("/api/telemetria/pacote", json=PACOTE_INICIAL).json()["estado"]["id_corrida_banco"]
        client.post("/api/telemetria/pacote", json=PACOTE_FINAL)
        assert session.get(Corrida, idb).velocidade_media == PACOTE_FINAL["v_med"]
