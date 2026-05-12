"""Serviço de Registro — persiste o pacote consolidado de uma corrida.

Responsabilidades:
  • Validação de integridade dos campos obrigatórios.
  • Persistência automática imediata ao fim da sessão.
  • Retry automático em caso de falha.
"""

from __future__ import annotations

import logging
import time

from sqlmodel import Session

from ..models.celula import Celula
from ..models.conexao_celula import ConexaoCelula
from ..models.corrida import Corrida
from ..models.labirinto import Labirinto
from ..models.percurso import Percurso
from ..schemas.corrida import CorridaStart, CorridaSave
from ..models.enums import StatusCorrida

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_DELAY_S = 1.0


class RegistroError(Exception):
    """Erro no processo de registro de corrida."""


def iniciar_corrida(session: Session, payload: CorridaStart) -> Corrida:
    """Inicia a sessão da corrida, criando Labirinto e Corrida."""
    labirinto = Labirinto(tipo_labirinto=payload.tipo_labirinto)
    session.add(labirinto)
    session.flush()

    corrida = Corrida(
        data_hora_inicio=payload.data_hora_inicio,
        id_labirinto=labirinto.id_labirinto,
        status_corrida=StatusCorrida.EM_ANDAMENTO,
    )
    session.add(corrida)
    session.commit()
    session.refresh(corrida)
    return corrida


def salvar_corrida(session: Session, id_corrida: int, payload: CorridaSave) -> Corrida:
    """Recebe os dados finais, valida e atualiza a corrida no banco."""
    last_exc: Exception | None = None
    for tentativa in range(1, MAX_RETRIES + 1):
        try:
            corrida = _persistir_save(session, id_corrida, payload)
            logger.info(
                "Corrida %s salva com sucesso (tentativa %d).",
                corrida.id_corrida,
                tentativa,
            )
            return corrida
        except Exception as exc:
            last_exc = exc
            logger.warning(
                "Falha ao salvar corrida (tentativa %d/%d): %s",
                tentativa,
                MAX_RETRIES,
                exc,
            )
            session.rollback()
            if tentativa < MAX_RETRIES:
                time.sleep(RETRY_DELAY_S)

    raise RegistroError(
        f"Falha ao salvar corrida após {MAX_RETRIES} tentativas."
    ) from last_exc


# Funções internas


def _persistir_save(session: Session, id_corrida: int, payload: CorridaSave) -> Corrida:
    if payload.tempo_total < 0:
        raise RegistroError("tempo_total não pode ser negativo.")

    corrida = session.get(Corrida, id_corrida)
    if not corrida:
        raise RegistroError("Corrida não encontrada.")

    corrida.tempo_total = payload.tempo_total
    corrida.tensao_media = payload.tensao_media
    corrida.corrente_media = payload.corrente_media
    corrida.velocidade_maxima_percurso = payload.velocidade_maxima_percurso
    corrida.velocidade_media = payload.velocidade_media
    corrida.status_corrida = payload.status_corrida
    corrida.desafio_cumprido = payload.desafio_cumprido
    corrida.data_hora_fim = payload.data_hora_fim

    # 3. Células
    celulas_criadas: list[Celula] = []
    for cel in payload.celulas:
        celula = Celula(
            coordenada_x=cel.coordenada_x,
            coordenada_y=cel.coordenada_y,
            parede_norte=cel.parede_norte,
            parede_sul=cel.parede_sul,
            parede_leste=cel.parede_leste,
            parede_oeste=cel.parede_oeste,
            id_labirinto=corrida.id_labirinto,
        )
        session.add(celula)
        celulas_criadas.append(celula)

    session.flush()

    # 4. Conexões entre células
    for con in payload.conexoes:
        conexao = ConexaoCelula(
            id_celula1=celulas_criadas[con.indice_celula1].id_celula,
            id_celula2=celulas_criadas[con.indice_celula2].id_celula,
        )
        session.add(conexao)

    # 5. Percurso
    for passo in payload.percurso:
        percurso = Percurso(
            id_celula=celulas_criadas[passo.indice_celula].id_celula,
            id_corrida=corrida.id_corrida,
            data_hora_passagem=passo.data_hora_passagem,
        )
        session.add(percurso)

    session.commit()
    session.refresh(corrida)
    return corrida
