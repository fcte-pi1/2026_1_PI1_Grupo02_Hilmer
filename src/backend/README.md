# Micromouse Backend

Este é o servidor backend para o projeto Micromouse, desenvolvido com FastAPI e PostgreSQL.

## 🚀 Tecnologias
- [Python 3.12+](https://www.python.org/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [SQLModel](https://sqlmodel.tiangolo.com/) (SQLAlchemy + Pydantic)
- [PostgreSQL](https://www.postgresql.org/)
- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)

## 🛠️ Como rodar o projeto

### 1. Pré-requisitos
Certifique-se de ter instalado:
- Python 3.12 ou superior
- Docker e Docker Compose

### 2. Configuração do Ambiente
Navegue até a pasta do backend:
```bash
cd src/backend
```

Crie um arquivo `.env` baseado no exemplo:
```bash
cp .env.example .env
```
*(O arquivo `.env.example` já vem configurado para conectar ao banco de dados local via Docker)*.

### 3. Usando Docker (Recomendado)
Para rodar a aplicação completa (API + Banco de Dados) via Docker:

```bash
docker compose up -d --build
```
Isso iniciará o banco de dados PostgreSQL e a API FastAPI.
O servidor estará disponível em: [http://localhost:8000](http://localhost:8000)

### 4. Rodando Localmente (Desenvolvimento)
Caso prefira rodar apenas o banco no Docker e a API localmente:

Inicie apenas o banco de dados:
```bash
docker compose up db -d
```

Crie e ative um ambiente virtual:
```bash
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# ou
.venv\Scripts\activate     # Windows
```

Instale as dependências:
```bash
pip install -r requirements.txt
```

Inicie o servidor de desenvolvimento:
```bash
fastapi dev app/main.py
```

O servidor estará disponível em: [http://localhost:8000](http://localhost:8000)

## 📖 Documentação (Swagger)
Após iniciar o servidor, você pode acessar a documentação interativa da API:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Redoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)