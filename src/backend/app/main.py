"""Ponto de entrada da aplicação FastAPI — Micromouse Backend."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel

from .database import engine
from .routers import corridas, rankings, telemetria

# Importar modelos para que o SQLModel.metadata os registre
from . import models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Cria as tabelas no banco na inicialização (se não existirem)."""
    SQLModel.metadata.create_all(engine)
    yield


app = FastAPI(
    title="Micromouse API",
    description="API para persistência e consulta de corridas do Micromouse.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — permitir acesso do frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar routers
app.include_router(corridas.router)
app.include_router(rankings.router)
app.include_router(telemetria.router)


@app.get("/", tags=["health"])
def health_check():
    """Endpoint de health check."""
    return {"status": "ok", "service": "micromouse-api"}
