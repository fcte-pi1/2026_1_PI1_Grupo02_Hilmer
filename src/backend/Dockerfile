FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copiar toda a api para o container
COPY . .

# Dar permissão de execução ao entrypoint
RUN chmod +x entrypoint.sh

# Definir o entrypoint
ENTRYPOINT ["./entrypoint.sh"]

# Comando padrão para iniciar o servidor
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]