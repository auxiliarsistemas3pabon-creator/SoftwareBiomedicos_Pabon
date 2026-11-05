#!/usr/bin/env bash
set -e

# Espera a que Postgres esté listo antes de arrancar Django.
if [ -n "$POSTGRES_HOST" ]; then
    echo "Esperando a PostgreSQL en ${POSTGRES_HOST}:${POSTGRES_PORT:-5432}..."
    until python -c "import socket,sys; s=socket.socket(); \
        s.settimeout(2); \
        sys.exit(0) if s.connect_ex(('${POSTGRES_HOST}', int('${POSTGRES_PORT:-5432}'))) == 0 else sys.exit(1)" 2>/dev/null; do
        sleep 1
    done
    echo "PostgreSQL listo."
fi

# Migraciones automáticas en dev (en prod se hacen explícitamente)
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    python manage.py migrate --noinput
fi

# Collect static (no falla si no hay apps todavía)
if [ "${COLLECT_STATIC:-false}" = "true" ]; then
    python manage.py collectstatic --noinput || true
fi

exec "$@"
