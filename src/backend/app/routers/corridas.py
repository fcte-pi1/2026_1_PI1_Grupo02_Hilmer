"""Router de Corridas — registro e consulta."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from ..database import get_session
from ..models.corrida import Corrida
from ..models.enums import TipoLabirinto
from ..models.labirinto import Labirinto
from ..models.percurso import Percurso
from ..schemas.corrida import (
    CorridaStart,
    CorridaSave,
    CorridaDetailResponse,
    CorridaResponse,
    PercursoResponse,
)
from ..services.registro import RegistroError, iniciar_corrida, salvar_corrida

router = APIRouter(prefix="/api/corridas", tags=["corridas"])


@router.post(
    "/iniciar",
    response_model=CorridaResponse,
    status_code=201,
    summary="Criar sessão de corrida",
)
def criar_sessao_corrida(
    payload: CorridaStart,
    session: Session = Depends(get_session),
) -> CorridaResponse:
    """Inicia uma corrida, criando a sessão no banco de dados com o labirinto."""
    try:
        corrida = iniciar_corrida(session, payload)
    except RegistroError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return _to_response(corrida, payload.tipo_labirinto)


@router.post(
    "/{id_corrida}/salvar",
    response_model=CorridaResponse,
    status_code=200,
    summary="Salvar dados finais da corrida",
)
def salvar_dados_corrida(
    id_corrida: int,
    payload: CorridaSave,
    session: Session = Depends(get_session),
) -> CorridaResponse:
    """Recebe requisição do front-end para salvar os dados finais de uma corrida."""
    try:
        corrida = salvar_corrida(session, id_corrida, payload)
    except RegistroError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # Busca o labirinto para obter o tipo
    statement = select(Labirinto).where(Labirinto.id_labirinto == corrida.id_labirinto)
    labirinto = session.exec(statement).first()
    tipo_labirinto = labirinto.tipo_labirinto if labirinto else None

    return _to_response(corrida, tipo_labirinto)


@router.get(
    "",
    response_model=list[CorridaResponse],
    summary="Listar corridas",
)
def listar_corridas(
    tipo: TipoLabirinto | None = Query(
        default=None,
        description="Filtrar por tipo de labirinto (4X4, 8X8, 16X16).",
    ),
    session: Session = Depends(get_session),
) -> list[CorridaResponse]:
    """Listagem cronológica decrescente de todas as corridas.

    Aceita filtro opcional por tipo de labirinto — sem
    recarregamento de página (o front-end passa o query param).
    """
    statement = (
        select(Corrida, Labirinto.tipo_labirinto)
        .join(Labirinto, Corrida.id_labirinto == Labirinto.id_labirinto, isouter=True)
    )

    if tipo is not None:
        statement = statement.where(Labirinto.tipo_labirinto == tipo)

    statement = statement.order_by(Corrida.data_hora_inicio.desc())  # type: ignore[union-attr]

    results = session.exec(statement).all()
    return [_to_response(corrida, tipo_lab) for corrida, tipo_lab in results]


@router.get(
    "/{id_corrida}",
    response_model=CorridaDetailResponse,
    summary="Detalhes de uma corrida",
)
def detalhar_corrida(
    id_corrida: int,
    session: Session = Depends(get_session),
) -> CorridaDetailResponse:
    """Exibe detalhes da corrida incluindo data/hora, tempo, status e
    velocidade média, além do percurso completo.
    """
    statement = (
        select(Corrida, Labirinto.tipo_labirinto)
        .join(Labirinto, Corrida.id_labirinto == Labirinto.id_labirinto, isouter=True)
        .where(Corrida.id_corrida == id_corrida)
    )
    result = session.exec(statement).first()

    if result is None:
        raise HTTPException(status_code=404, detail="Corrida não encontrada.")

    corrida, tipo_lab = result

    # Buscar percurso
    percurso_statement = (
        select(Percurso)
        .where(Percurso.id_corrida == id_corrida)
        .order_by(Percurso.data_hora_passagem)  # type: ignore[arg-type]
    )
    percursos = session.exec(percurso_statement).all()

    resp = _to_response(corrida, tipo_lab)
    return CorridaDetailResponse(
        **resp.model_dump(),
        percurso=[PercursoResponse.model_validate(p) for p in percursos],
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _to_response(
    corrida: Corrida,
    tipo_labirinto: TipoLabirinto | None = None,
) -> CorridaResponse:
    """Converte modelo ORM para schema de resposta."""
    return CorridaResponse(
        id_corrida=corrida.id_corrida,  # type: ignore[arg-type]
        tempo_total=corrida.tempo_total,
        tensao_media=corrida.tensao_media,
        corrente_media=corrida.corrente_media,
        velocidade_maxima_percurso=corrida.velocidade_maxima_percurso,
        velocidade_media=corrida.velocidade_media,
        status_corrida=corrida.status_corrida,
        desafio_cumprido=corrida.desafio_cumprido,
        data_hora_inicio=corrida.data_hora_inicio,
        data_hora_fim=corrida.data_hora_fim,
        tipo_labirinto=tipo_labirinto,
    )
