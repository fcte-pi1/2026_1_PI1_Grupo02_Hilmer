"""Fixtures compartilhadas para testes."""
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.exc import ProgrammingError
from sqlmodel import SQLModel, Session, create_engine
from fastapi.testclient import TestClient

from app.main import app
from app.database import get_session
from app.config import settings

import subprocess
import time

# URL do banco de teste rodando no container db_test
TEST_DATABASE_URL = "postgresql://micromouse:micromouse@localhost:5433/micromouse_test"


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """
    Garante que o container db_test esteja rodando e as tabelas criadas.
    """
    print("\nIniciando container de banco de dados de teste...")
    subprocess.run(["docker", "compose", "up", "-d", "db_test"], check=True)

    # Aguarda o banco ficar pronto (healthcheck do docker ou retry manual)
    engine = create_engine(TEST_DATABASE_URL)

    retries = 10
    while retries > 0:
        try:
            with engine.connect() as conn:
                break
        except Exception:
            retries -= 1
            time.sleep(1)

    if retries == 0:
        pytest.fail(
            "Não foi possível conectar ao banco de dados de teste no Docker.")

    SQLModel.metadata.create_all(engine)
    engine.dispose()


@pytest.fixture(name="session")
def session_fixture():
    """
    Cria as tabelas e fornece uma sessão limpa para cada teste.
    """
    engine = create_engine(TEST_DATABASE_URL)

    # Cria as tabelas
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        yield session

    # Opcional: Limpa o banco após o teste
    SQLModel.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture(name="client")
def client_fixture(session: Session):
    """
    Sobrescreve a dependência get_session do FastAPI para usar a sessão de teste.
    """
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
