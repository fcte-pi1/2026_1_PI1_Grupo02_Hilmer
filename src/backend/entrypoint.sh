#!/bin/sh

# Interrompe a execução se algum comando falhar
set -e

echo "=== ENTRYPOINT: Iniciando verificações ==="

if [ -f "alembic.ini" ]; then
    echo "=== ENTRYPOINT: Alembic detectado. Executando migrações (alembic upgrade head)... ==="
    alembic upgrade head
else
    echo "=== ENTRYPOINT: Alembic não encontrado ou não configurado. Pulando migrações. ==="
fi

echo "=== ENTRYPOINT: Executando comando principal da aplicação... ==="
exec "$@"
