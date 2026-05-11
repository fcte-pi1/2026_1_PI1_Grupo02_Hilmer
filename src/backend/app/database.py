from collections.abc import Generator

from sqlmodel import Session, create_engine

from .config import settings

engine = create_engine(settings.DATABASE_URL, echo=False)


def get_session() -> Generator[Session, None, None]:
    """Dependency que fornece uma sessão do banco de dados."""
    with Session(engine) as session:
        yield session
