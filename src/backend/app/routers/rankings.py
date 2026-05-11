"""Router de Rankings — melhores tempos por tipo de labirinto."""

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select

from ..database import get_session
from ..models.corrida import Corrida
from ..models.enums import StatusCorrida, TipoLabirinto
from ..models.labirinto import Labirinto
from ..schemas.corrida import CorridaResponse

router = APIRouter(prefix="/api/rankings", tags=["rankings"])


@router.get(
    "",
    response_model=list[CorridaResponse],
    summary="Ranking de corridas por melhor tempo",
)
def listar_ranking(
    tipo: TipoLabirinto | None = Query(
        default=None,
        description="Filtrar por tipo de labirinto (4X4, 8X8, 16X16).",
    ),
    limit: int = Query(
        default=10,
        ge=1,
        le=100,
        description="Número máximo de registros retornados.",
    ),
    session: Session = Depends(get_session),
) -> list[CorridaResponse]:
    """Retorna as corridas concluídas ordenadas pelo menor tempo total (melhor primeiro).

    Aceita filtro opcional por tipo de labirinto e limite de registros.
    Apenas corridas com status CONCLUIDA e desafio_cumprido são consideradas.
    """
    statement = (
        select(Corrida, Labirinto.tipo_labirinto)
        .join(Labirinto, Corrida.id_labirinto == Labirinto.id_labirinto, isouter=True)
        .where(Corrida.status_corrida == StatusCorrida.CONCLUIDA)
        .where(Corrida.desafio_cumprido == True)  # noqa: E712
        .where(Corrida.tempo_total.isnot(None))  # type: ignore[union-attr]
    )

    if tipo is not None:
        statement = statement.where(Labirinto.tipo_labirinto == tipo)

    statement = (
        statement
        .order_by(Corrida.tempo_total.asc())  # type: ignore[union-attr]
        .limit(limit)
    )

    results = session.exec(statement).all()

    return [
        CorridaResponse(
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
            tipo_labirinto=tipo_lab,
        )
        for corrida, tipo_lab in results
    ]
