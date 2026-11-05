"""Settings Django por entorno (`config.settings`).

No hay lógica aquí: cada archivo es un módulo de configuración.

- `base.py`: INSTALLED_APPS (DRF, spectacular, axes, cors, channels,
  las apps de `apps.*`), Postgres, Redis (caché, broker Celery,
  channel layer), autenticación CookieJWT + SimpleJWT con rotación y
  blacklist, CORS con credenciales, CSP, Celery, paginación DRF,
  locale `es-co` y zona `America/Bogota`, `FRONTEND_BASE_URL` para
  el payload de los QR.
- `dev.py`: DEBUG, toolbar opcional, secretos de desarrollo.
- `prod.py`: DEBUG off, SECRET_KEY fuerte, HTTPS, cookies seguras,
  HSTS; media/estáticos normalmente en S3 o reverse-proxy.

Django carga uno u otro según `DJANGO_SETTINGS_MODULE`
(p. ej. `config.settings.dev` en Docker).
"""
