"""Testes de persistência — TASK-SW-16A.

Cobre os critérios de aceite:
  ✓ Modelo de banco para dados da corrida.
  ✓ Salva dados consolidados ao receber evento de encerramento.
  ✓ Registra trajeto percorrido durante a execução.
  ✓ Registra dados de telemetria recebidos.
  ✓ Registra tempo total da corrida.
  ✓ Registra resultado do desafio.
  ✓ Registra tipo/dimensão do labirinto.
  ✓ Impede persistência com campos obrigatórios ausentes.
"""
from datetime import datetime, UTC

import pytest
from sqlmodel import Session, select
from fastapi.testclient import TestClient

from app.models.corrida import Corrida
from app.models.labirinto import Labirinto
from app.models.percurso import Percurso
from app.models.celula import Celula
from app.models.evento import Evento
from app.models.enums import StatusCorrida, TipoLabirinto
from app.schemas.corrida import (
    CorridaStart,
    CorridaSave,
    CelulaCreate,
    ConexaoCreate,
    PercursoCreate,
)
from app.services.registro import RegistroError, iniciar_corrida, salvar_corrida


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

PACOTE_INICIAL = {
    "id_corrida": 42,
    "timestamp_ms": 0,
    "dimensao": 4,
    "tentativa": 1,
    "bateria": 100.0,
}

PACOTE_MOV_1 = {
    "id_corrida": 42,
    "timestamp_ms": 1000,
    "x": 1,
    "y": 0,
    "w": 0,
    "bateria": 98.0,
}

PACOTE_MOV_2 = {
    "id_corrida": 42,
    "timestamp_ms": 2000,
    "x": 2,
    "y": 0,
    "w": 0,
}

PACOTE_ROTA = {
    "id_corrida": 42,
    "timestamp_ms": 3000,
    "rota": [[0,0], [1,0], [2,0]],
}

PACOTE_FINAL = {
    "id_corrida": 42,
    "timestamp_ms": 5000,
    "sucesso": True,
    "v_med": 25.0,
    "bateria": 85.0,
}


# ---------------------------------------------------------------------------
# Testes do serviço de registro (registro.py)
# ---------------------------------------------------------------------------


class TestIniciarCorrida:
    """CA: Existe uma estrutura/modelo de banco para armazenar dados da corrida."""

    def test_cria_labirinto_e_corrida(self, session: Session):
        payload = CorridaStart(
            tipo_labirinto=TipoLabirinto.QUATRO,
            data_hora_inicio=datetime.now(UTC),
        )
        corrida = iniciar_corrida(session, payload)

        assert corrida.id_corrida is not None
        assert corrida.id_labirinto is not None
        assert corrida.status_corrida == StatusCorrida.EM_ANDAMENTO

    def test_labirinto_tem_tipo_correto_4x4(self, session: Session):
        payload = CorridaStart(
            tipo_labirinto=TipoLabirinto.QUATRO,
            data_hora_inicio=datetime.now(UTC),
        )
        corrida = iniciar_corrida(session, payload)
        labirinto = session.get(Labirinto, corrida.id_labirinto)

        assert labirinto is not None
        assert labirinto.tipo_labirinto == TipoLabirinto.QUATRO

    def test_labirinto_tem_tipo_correto_16x16(self, session: Session):
        payload = CorridaStart(
            tipo_labirinto=TipoLabirinto.DEZESSEIS,
            data_hora_inicio=datetime.now(UTC),
        )
        corrida = iniciar_corrida(session, payload)
        labirinto = session.get(Labirinto, corrida.id_labirinto)

        assert labirinto.tipo_labirinto == TipoLabirinto.DEZESSEIS

    def test_data_hora_inicio_e_salva(self, session: Session):
        agora = datetime.now(UTC)
        payload = CorridaStart(
            tipo_labirinto=TipoLabirinto.OITO,
            data_hora_inicio=agora,
        )
        corrida = iniciar_corrida(session, payload)
        assert corrida.data_hora_inicio is not None


class TestSalvarCorrida:
    """CA: Sistema salva dados consolidados ao receber evento de encerramento."""

    def _base(self, session: Session) -> Corrida:
        return iniciar_corrida(
            session,
            CorridaStart(
                tipo_labirinto=TipoLabirinto.QUATRO,
                data_hora_inicio=datetime.now(UTC),
            ),
        )

    def test_salva_campos_basicos(self, session: Session):
        corrida = self._base(session)
        payload = CorridaSave(
            tempo_total=5000,
            velocidade_media=30.0,
            velocidade_maxima_percurso=55.0,
            status_corrida=StatusCorrida.CONCLUIDA,
            desafio_cumprido=True,
            data_hora_fim=datetime.now(UTC),
        )
        resultado = salvar_corrida(session, corrida.id_corrida, payload)

        assert resultado.tempo_total == 5000
        assert resultado.velocidade_media == 30.0
        assert resultado.status_corrida == StatusCorrida.CONCLUIDA
        assert resultado.desafio_cumprido is True

    def test_salva_resultado_falha(self, session: Session):
        """CA: Registra resultado do desafio (sucesso/falha)."""
        corrida = self._base(session)
        payload = CorridaSave(
            tempo_total=3000,
            status_corrida=StatusCorrida.CONCLUIDA,
            desafio_cumprido=False,
        )
        resultado = salvar_corrida(session, corrida.id_corrida, payload)

        assert resultado.desafio_cumprido is False
        assert resultado.status_corrida == StatusCorrida.CONCLUIDA

    def test_salva_percurso_via_celulas(self, session: Session):
        """CA: Registra trajeto percorrido."""
        corrida = self._base(session)
        celulas = [
            CelulaCreate(coordenada_x=0, coordenada_y=0,
                         parede_norte=False, parede_sul=True,
                         parede_leste=False, parede_oeste=True),
            CelulaCreate(coordenada_x=1, coordenada_y=0,
                         parede_norte=False, parede_sul=True,
                         parede_leste=False, parede_oeste=False),
        ]
        percurso = [
            PercursoCreate(indice_celula=0, data_hora_passagem=datetime.now(UTC)),
            PercursoCreate(indice_celula=1, data_hora_passagem=datetime.now(UTC)),
        ]
        payload = CorridaSave(
            tempo_total=2000,
            status_corrida=StatusCorrida.CONCLUIDA,
            desafio_cumprido=True,
            celulas=celulas,
            percurso=percurso,
        )
        salvar_corrida(session, corrida.id_corrida, payload)

        passos = session.exec(
            select(Percurso).where(Percurso.id_corrida == corrida.id_corrida)
        ).all()
        assert len(passos) == 2

    def test_tempo_total_negativo_levanta_registro_error(self, session: Session):
        """CA: Impede persistência quando campos obrigatórios estiverem inválidos."""
        corrida = self._base(session)
        payload = CorridaSave(
            tempo_total=-1,
            status_corrida=StatusCorrida.CONCLUIDA,
            desafio_cumprido=False,
        )
        with pytest.raises(RegistroError):
            salvar_corrida(session, corrida.id_corrida, payload)

    def test_corrida_inexistente_levanta_registro_error(self, session: Session):
        """CA: Impede persistência quando corrida não existe."""
        payload = CorridaSave(
            tempo_total=1000,
            status_corrida=StatusCorrida.CONCLUIDA,
            desafio_cumprido=True,
        )
        with pytest.raises(RegistroError):
            salvar_corrida(session, 999999, payload)


# ---------------------------------------------------------------------------
# Testes de persistência via fluxo de telemetria (endpoint HTTP)
# ---------------------------------------------------------------------------


class TestPersistenciaFluxoTelemetria:
    """Testa persistência end-to-end via endpoint POST /api/telemetria/pacote."""

    def test_pacote_inicial_cria_corrida_no_banco(
        self, client: TestClient, session: Session
    ):
        """CA: Existe estrutura de banco / registra tipo do labirinto."""
        resp = client.post("/api/telemetria/pacote", json=PACOTE_INICIAL)
        assert resp.status_code == 201

        id_corrida_banco = resp.json()["estado"]["id_corrida_banco"]
        assert id_corrida_banco is not None

        corrida = session.get(Corrida, id_corrida_banco)
        assert corrida is not None
        assert corrida.status_corrida == StatusCorrida.EM_ANDAMENTO
        assert corrida.sessao_hardware_id == 42

        labirinto = session.get(Labirinto, corrida.id_labirinto)
        assert labirinto is not None
        assert labirinto.tipo_labirinto == TipoLabirinto.QUATRO

    def test_pacote_movimentacao_registra_percurso(
        self, client: TestClient, session: Session
    ):
        """CA: Sistema registra trajeto percorrido durante a execução."""
        resp_ini = client.post("/api/telemetria/pacote", json=PACOTE_INICIAL)
        id_corrida_banco = resp_ini.json()["estado"]["id_corrida_banco"]

        client.post("/api/telemetria/pacote", json=PACOTE_MOV_1)
        client.post("/api/telemetria/pacote", json=PACOTE_MOV_2)

        passos = session.exec(
            select(Percurso).where(Percurso.id_corrida == id_corrida_banco)
        ).all()
        assert len(passos) == 2

    def test_pacote_rota_registra_percurso_otimizado(
        self, client: TestClient, session: Session
    ):
        """CA: Sistema registra trajeto da rota otimizada."""
        resp_ini = client.post("/api/telemetria/pacote", json=PACOTE_INICIAL)
        id_corrida_banco = resp_ini.json()["estado"]["id_corrida_banco"]

        resp_rota = client.post("/api/telemetria/pacote", json=PACOTE_ROTA)
        assert resp_rota.status_code == 201

        passos = session.exec(
            select(Percurso)
            .where(Percurso.id_corrida == id_corrida_banco)
            .order_by(Percurso.id_percurso)
        ).all()

        assert len(passos) == 3
        for i, pt in enumerate(PACOTE_ROTA["rota"]):
            assert passos[i].celula.coordenada_x == pt[0]
            assert passos[i].celula.coordenada_y == pt[1]
            assert passos[i].tipo_percurso == "otimizado"

    def test_percurso_reutiliza_celula_existente(
        self, client: TestClient, session: Session
    ):
        """Robô que revisita posição não deve duplicar Célula, só Percurso."""
        client.post("/api/telemetria/pacote", json=PACOTE_INICIAL)
        # Dois pacotes na mesma posição (x=1, y=0)
        client.post("/api/telemetria/pacote", json=PACOTE_MOV_1)
        client.post("/api/telemetria/pacote", json={**PACOTE_MOV_1, "timestamp_ms": 3000})

        celulas = session.exec(
            select(Celula).where(Celula.coordenada_x == 1).where(Celula.coordenada_y == 0)
        ).all()
        # Apenas uma Célula para a posição (1, 0)
        assert len(celulas) == 1

    def test_pacote_final_salva_tempo_total(
        self, client: TestClient, session: Session
    ):
        """CA: Sistema registra tempo total da corrida."""
        resp_ini = client.post("/api/telemetria/pacote", json=PACOTE_INICIAL)
        id_corrida_banco = resp_ini.json()["estado"]["id_corrida_banco"]

        client.post("/api/telemetria/pacote", json=PACOTE_FINAL)

        corrida = session.get(Corrida, id_corrida_banco)
        assert corrida.tempo_total == PACOTE_FINAL["timestamp_ms"]

    def test_pacote_final_salva_resultado_desafio(
        self, client: TestClient, session: Session
    ):
        """CA: Sistema registra resultado do desafio (sucesso/falha)."""
        resp_ini = client.post("/api/telemetria/pacote", json=PACOTE_INICIAL)
        id_corrida_banco = resp_ini.json()["estado"]["id_corrida_banco"]

        client.post("/api/telemetria/pacote", json=PACOTE_FINAL)

        corrida = session.get(Corrida, id_corrida_banco)
        assert corrida.desafio_cumprido is True
        assert corrida.status_corrida == StatusCorrida.CONCLUIDA

    def test_pacote_final_falha_salva_status_correto(
        self, client: TestClient, session: Session
    ):
        """CA: Resultado de falha registrado corretamente via desafio_cumprido."""
        resp_ini = client.post("/api/telemetria/pacote", json=PACOTE_INICIAL)
        id_corrida_banco = resp_ini.json()["estado"]["id_corrida_banco"]

        pacote_falha = {**PACOTE_FINAL, "sucesso": False}
        client.post("/api/telemetria/pacote", json=pacote_falha)

        corrida = session.get(Corrida, id_corrida_banco)
        assert corrida.desafio_cumprido is False
        # Status é sempre CONCLUIDA quando o pacote final é recebido
        assert corrida.status_corrida == StatusCorrida.CONCLUIDA

    def test_pacote_invalido_nao_persiste(
        self, client: TestClient, session: Session
    ):
        """CA: Impede persistência quando campos obrigatórios estão ausentes."""
        # Pacote sem id_corrida e sem campos reconhecíveis
        resp = client.post("/api/telemetria/pacote", json={"foo": "bar"})
        assert resp.status_code == 422

    def test_corrida_conclui_com_velocidade_media_do_firmware(
        self, client: TestClient, session: Session
    ):
        """CA: Sistema registra dados de telemetria — velocidade média (do pacote final)."""
        resp_ini = client.post("/api/telemetria/pacote", json=PACOTE_INICIAL)
        id_corrida_banco = resp_ini.json()["estado"]["id_corrida_banco"]

        client.post("/api/telemetria/pacote", json=PACOTE_FINAL)

        corrida = session.get(Corrida, id_corrida_banco)
        assert corrida.velocidade_media == PACOTE_FINAL["v_med"]
