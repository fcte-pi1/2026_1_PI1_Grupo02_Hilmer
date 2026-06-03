"""Testes do endpoint GET /api/labirintos/melhor-resultado?tipo=<TIPO>.

Cobertura:
  ✓ Tipo com múltiplas corridas concluídas → retorna a de menor tempo_total
  ✓ Tipo sem nenhuma corrida com desafio_cumprido=True → retorna null
  ✓ Corrida com status_corrida = ABORTADA não aparece no resultado
  ✓ Filtro por tipo (4X4, 8X8, 16X16) isola corretamente
"""

from datetime import datetime, UTC

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.corrida import Corrida
from app.models.enums import StatusCorrida, TipoLabirinto
from app.models.labirinto import Labirinto


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _criar_labirinto(session: Session, tipo: TipoLabirinto) -> Labirinto:
    """Cria e persiste um labirinto de teste."""
    lab = Labirinto(tipo_labirinto=tipo)
    session.add(lab)
    session.commit()
    session.refresh(lab)
    return lab


def _criar_corrida(
    session: Session,
    id_labirinto: int,
    *,
    tempo_total: int | None = None,
    status: StatusCorrida = StatusCorrida.CONCLUIDA,
    desafio_cumprido: bool = True,
    data_hora_fim: datetime | None = None,
) -> Corrida:
    """Cria e persiste uma corrida de teste."""
    corrida = Corrida(
        id_labirinto=id_labirinto,
        tempo_total=tempo_total,
        status_corrida=status,
        desafio_cumprido=desafio_cumprido,
        data_hora_inicio=datetime.now(UTC),
        data_hora_fim=data_hora_fim or datetime.now(UTC),
    )
    session.add(corrida)
    session.commit()
    session.refresh(corrida)
    return corrida


# ---------------------------------------------------------------------------
# Testes
# ---------------------------------------------------------------------------


class TestMelhorResultadoEndpoint:
    """Testa GET /api/labirintos/melhor-resultado?tipo=<TIPO>."""

    # CA-17-01: múltiplas corridas → retorna a de menor tempo_total
    def test_retorna_corrida_de_menor_tempo(
        self, client: TestClient, session: Session
    ):
        """Dado múltiplas corridas concluídas com desafio cumprido (em labirintos
        distintos do mesmo tipo, como ocorre na prática), deve retornar a de
        menor tempo_total."""
        lab1 = _criar_labirinto(session, TipoLabirinto.QUATRO)
        lab2 = _criar_labirinto(session, TipoLabirinto.QUATRO)
        lab3 = _criar_labirinto(session, TipoLabirinto.QUATRO)

        _criar_corrida(session, lab1.id_labirinto, tempo_total=5000)
        c_melhor = _criar_corrida(session, lab2.id_labirinto, tempo_total=3000)
        _criar_corrida(session, lab3.id_labirinto, tempo_total=7000)

        resp = client.get("/api/labirintos/melhor-resultado", params={"tipo": "4X4"})

        assert resp.status_code == 200
        data = resp.json()
        assert data["melhor_resultado"] is not None
        assert data["melhor_resultado"]["id_corrida"] == c_melhor.id_corrida
        assert data["melhor_resultado"]["tempo_total"] == 3000

    # CA-17-03: sem corridas com desafio cumprido → retorna null
    def test_retorna_null_sem_desafio_cumprido(
        self, client: TestClient, session: Session
    ):
        """Dado nenhuma corrida com desafio_cumprido=True para o tipo,
        deve retornar melhor_resultado como null."""
        lab = _criar_labirinto(session, TipoLabirinto.OITO)

        _criar_corrida(
            session, lab.id_labirinto,
            tempo_total=4000,
            desafio_cumprido=False,
        )

        resp = client.get("/api/labirintos/melhor-resultado", params={"tipo": "8X8"})

        assert resp.status_code == 200
        data = resp.json()
        assert data["melhor_resultado"] is None

    # Corrida ABORTADA não aparece
    def test_corrida_abortada_nao_aparece(
        self, client: TestClient, session: Session
    ):
        """Corrida com status ABORTADA não deve ser considerada para o recorde."""
        lab1 = _criar_labirinto(session, TipoLabirinto.DEZESSEIS)
        lab2 = _criar_labirinto(session, TipoLabirinto.DEZESSEIS)

        # Corrida abortada com tempo baixo — não deveria aparecer
        _criar_corrida(
            session, lab1.id_labirinto,
            tempo_total=1000,
            status=StatusCorrida.ABORTADA,
            desafio_cumprido=True,
        )
        # Corrida concluída com tempo maior
        c_valida = _criar_corrida(
            session, lab2.id_labirinto,
            tempo_total=5000,
            status=StatusCorrida.CONCLUIDA,
            desafio_cumprido=True,
        )

        resp = client.get("/api/labirintos/melhor-resultado", params={"tipo": "16X16"})

        assert resp.status_code == 200
        data = resp.json()
        assert data["melhor_resultado"] is not None
        assert data["melhor_resultado"]["id_corrida"] == c_valida.id_corrida
        assert data["melhor_resultado"]["tempo_total"] == 5000

    # Filtro por tipo isola corretamente
    def test_filtro_por_tipo_isola_resultados(
        self, client: TestClient, session: Session
    ):
        """Corridas em tipos diferentes não se misturam."""
        lab_4x4 = _criar_labirinto(session, TipoLabirinto.QUATRO)
        lab_8x8 = _criar_labirinto(session, TipoLabirinto.OITO)

        c_4x4 = _criar_corrida(session, lab_4x4.id_labirinto, tempo_total=2000)
        # Corrida 8x8 com tempo menor — não deve interferir no 4X4
        _criar_corrida(session, lab_8x8.id_labirinto, tempo_total=1000)

        resp = client.get("/api/labirintos/melhor-resultado", params={"tipo": "4X4"})

        assert resp.status_code == 200
        data = resp.json()
        assert data["melhor_resultado"]["id_corrida"] == c_4x4.id_corrida
        assert data["melhor_resultado"]["tempo_total"] == 2000

    # CA-17-04: resposta inclui id_corrida, tempo_total, data_hora_fim, tipo_labirinto
    def test_resposta_contem_campos_rastreabilidade(
        self, client: TestClient, session: Session
    ):
        """O destaque deve incluir id_corrida, tempo_total, data_hora_fim
        e tipo_labirinto para rastreabilidade."""
        lab = _criar_labirinto(session, TipoLabirinto.QUATRO)
        fim = datetime(2026, 5, 31, 12, 0, 0, tzinfo=UTC)
        _criar_corrida(
            session, lab.id_labirinto,
            tempo_total=4200,
            data_hora_fim=fim,
        )

        resp = client.get("/api/labirintos/melhor-resultado", params={"tipo": "4X4"})

        assert resp.status_code == 200
        resultado = resp.json()["melhor_resultado"]
        assert "id_corrida" in resultado
        assert resultado["tempo_total"] == 4200
        assert "data_hora_fim" in resultado
        assert resultado["tipo_labirinto"] == "4X4"

    # Tipo sem nenhuma corrida → retorna null (não 404)
    def test_tipo_sem_corridas_retorna_null(
        self, client: TestClient, session: Session
    ):
        """Tipo de labirinto sem corridas associadas → melhor_resultado null."""
        resp = client.get("/api/labirintos/melhor-resultado", params={"tipo": "16X16"})

        assert resp.status_code == 200
        assert resp.json()["melhor_resultado"] is None

    # Tipo inválido → 422
    def test_tipo_invalido_retorna_422(
        self, client: TestClient, session: Session
    ):
        """Tipo de labirinto inválido deve retornar 422."""
        resp = client.get("/api/labirintos/melhor-resultado", params={"tipo": "INVALIDO"})
        assert resp.status_code == 422
