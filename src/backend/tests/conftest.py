"""Fixtures compartilhadas para testes."""
import os
import subprocess
import time

import pytest
from sqlalchemy.exc import ProgrammingError
from sqlmodel import SQLModel, Session, create_engine
from fastapi.testclient import TestClient

from app.main import app
from app.database import get_session
from app.config import settings
from app.routers.telemetria import estados_ativos
from app.services.connection_monitor import connection_monitor

# Detecta se está dentro de um container Docker
_INSIDE_DOCKER = os.path.exists("/.dockerenv")

# URL do banco de teste — ajusta host conforme ambiente
if _INSIDE_DOCKER:
    # Dentro do container: db_test é um serviço na mesma rede Docker
    TEST_DATABASE_URL = "postgresql://micromouse:micromouse@db_test:5432/micromouse_test"
else:
    # Fora do container: banco de teste exposto na porta 5433 do host
    TEST_DATABASE_URL = "postgresql://micromouse:micromouse@localhost:5433/micromouse_test"


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """
    Garante que o banco de teste esteja rodando e as tabelas criadas.
    - Fora do Docker: sobe o container db_test via docker compose.
    - Dentro do Docker: o db_test já está disponível na rede Docker.
    """
    if not _INSIDE_DOCKER:
        print("\nIniciando container de banco de dados de teste...")
        subprocess.run(["docker", "compose", "up", "-d", "db_test"], check=True)

    # Aguarda o banco ficar pronto
    engine = create_engine(TEST_DATABASE_URL)

    retries = 15
    while retries > 0:
        try:
            with engine.connect() as conn:
                break
        except Exception:
            retries -= 1
            time.sleep(1)

    if retries == 0:
        pytest.fail(
            "Não foi possível conectar ao banco de dados de teste.")

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
    Também substitui o engine de produção pelo engine de teste para que o lifespan
    (SQLModel.metadata.create_all) não tente conectar no host 'db' inacessível.
    """
    import app.database as db_module
    import app.main as main_module

    test_engine = create_engine(TEST_DATABASE_URL)
    original_engine = db_module.engine

    # Redireciona o engine usado pelo lifespan e pelo módulo de banco
    db_module.engine = test_engine
    main_module.engine = test_engine

    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()

    # Restaura o engine original
    db_module.engine = original_engine
    main_module.engine = original_engine
    test_engine.dispose()


@pytest.fixture(autouse=True)
def limpar_estados_ativos():
    """Isola o estado em memória da telemetria entre testes."""
    estados_ativos.clear()
    connection_monitor.clear()
    yield
    estados_ativos.clear()
    connection_monitor.clear()
