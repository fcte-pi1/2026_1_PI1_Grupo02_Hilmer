"""Router de Labirinto — consulta e listagem."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from ..database import get_session
from ..models.celula import Celula
from ..models.corrida import Corrida
from ..models.enums import StatusCorrida, TipoLabirinto
from ..models.labirinto import Labirinto
from ..schemas.labirinto import (
    CelulaResponse,
    LabirintoResponse,
    LabirintoResumoResponse,
    MelhorResultadoResponse,
    RecordeLabirintoResponse,
)

router = APIRouter(prefix="/api/labirintos", tags=["labirintos"])


@router.get(
    "",
    response_model=list[LabirintoResumoResponse],
    summary="Listar todos os labirintos",
)
def listar_labirintos(
    tipo: TipoLabirinto | None = Query(
        default=None,
        description="Filtrar por tipo de labirinto (4X4, 8X8, 16X16).",
    ),
    session: Session = Depends(get_session),
) -> list[LabirintoResumoResponse]:
    """Lista todos os labirintos disponíveis no banco de dados.

    Aceita filtro opcional por tipo de labirinto.
    """
    statement = select(Labirinto)

    if tipo is not None:
        statement = statement.where(Labirinto.tipo_labirinto == tipo)

    statement = statement.order_by(Labirinto.id_labirinto)
    labirintos = session.exec(statement).all()

    return [
        LabirintoResumoResponse(
            id_labirinto=lab.id_labirinto,
            tipo_labirinto=lab.tipo_labirinto,
        )
        for lab in labirintos
    ]



@router.get(
    "/melhor-resultado",
    response_model=MelhorResultadoResponse,
    summary="Melhor resultado (recorde) por tipo de labirinto",
)
def obter_melhor_resultado(
    tipo: TipoLabirinto = Query(
        description="Tipo de labirinto (4X4, 8X8, 16X16).",
    ),
    session: Session = Depends(get_session),
) -> MelhorResultadoResponse:
    """Retorna a corrida com o menor tempo de conclusão dentre todos
    os labirintos do tipo informado, filtrando apenas sessões concluídas
    com desafio cumprido.
    """
    # Buscar melhor resultado entre todos os labirintos do tipo
    statement = (
        select(Corrida)
        .join(Labirinto, Corrida.id_labirinto == Labirinto.id_labirinto)
        .where(Labirinto.tipo_labirinto == tipo)
        .where(Corrida.status_corrida == StatusCorrida.CONCLUIDA)
        .where(Corrida.desafio_cumprido == True)  # noqa: E712
        .where(Corrida.tempo_total.isnot(None))  # type: ignore[union-attr]
        .order_by(Corrida.tempo_total.asc())  # type: ignore[union-attr]
        .limit(1)
    )
    corrida = session.exec(statement).first()

    if corrida is None:
        return MelhorResultadoResponse(melhor_resultado=None)

    return MelhorResultadoResponse(
        melhor_resultado=RecordeLabirintoResponse(
            id_corrida=corrida.id_corrida,  # type: ignore[arg-type]
            tempo_total=corrida.tempo_total,  # type: ignore[arg-type]
            data_hora_fim=corrida.data_hora_fim,  # type: ignore[arg-type]
            tipo_labirinto=tipo,
        )
    )


@router.get(
    "/{id_labirinto}",
    response_model=LabirintoResponse,
    summary="Obter labirinto com células",
)
def obter_labirinto(
    id_labirinto: int,
    session: Session = Depends(get_session),
) -> LabirintoResponse:
    """Retorna um labirinto específico com todas as suas células e paredes.

    Este é o endpoint principal para carregar o labirinto no frontend
    para visualização e exploração.
    """
    statement = select(Labirinto).where(
        Labirinto.id_labirinto == id_labirinto
    )
    labirinto = session.exec(statement).first()

    if labirinto is None:
        raise HTTPException(
            status_code=404,
            detail="Labirinto não encontrado.",
        )

    # Buscar todas as células do labirinto
    celulas_statement = (
        select(Celula)
        .where(Celula.id_labirinto == id_labirinto)
        .order_by(Celula.coordenada_x, Celula.coordenada_y)
    )
    celulas = session.exec(celulas_statement).all()

    return LabirintoResponse(
        id_labirinto=labirinto.id_labirinto,
        tipo_labirinto=labirinto.tipo_labirinto,
        celulas=[
            CelulaResponse(
                id_celula=celula.id_celula,
                coordenada_x=celula.coordenada_x,
                coordenada_y=celula.coordenada_y,
                parede_norte=celula.parede_norte or False,
                parede_sul=celula.parede_sul or False,
                parede_leste=celula.parede_leste or False,
                parede_oeste=celula.parede_oeste or False,
            )
            for celula in celulas
        ],
    )


@router.get(
    "/por-tipo/{tipo}",
    response_model=list[LabirintoResumoResponse],
    summary="Listar labirintos por tipo",
)
def listar_labirintos_por_tipo(
    tipo: TipoLabirinto,
    session: Session = Depends(get_session),
) -> list[LabirintoResumoResponse]:
    """Lista todos os labirintos de um tipo específico (4X4, 8X8, 16X16)."""
    statement = (
        select(Labirinto)
        .where(Labirinto.tipo_labirinto == tipo)
        .order_by(Labirinto.id_labirinto)
    )
    labirintos = session.exec(statement).all()

    return [
        LabirintoResumoResponse(
            id_labirinto=lab.id_labirinto,
            tipo_labirinto=lab.tipo_labirinto,
        )
        for lab in labirintos
    ]
