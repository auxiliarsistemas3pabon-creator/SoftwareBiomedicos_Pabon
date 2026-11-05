FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Dependencias del sistema (psycopg, Pillow, qrcode)
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        libjpeg-dev \
        zlib1g-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instala dependencias primero para aprovechar el cache de Docker
COPY requirements/ /app/requirements/
ARG REQUIREMENTS=dev
RUN pip install --upgrade pip && pip install -r requirements/${REQUIREMENTS}.txt

# Copia el código
COPY . /app/

# Entrypoint
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# No correr la app como root dentro del contenedor.
RUN useradd --create-home --shell /bin/bash appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
# daphne (ASGI) por defecto: sirve HTTP + WebSockets (canal /ws/ de Channels).
# docker-compose.yml de desarrollo sobreescribe este CMD con `runserver`
# (ASGI por Daphne); allí se desactiva el autoreloader para evitar errores de
# stat sobre el bind mount en Docker Desktop/Windows.
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]
