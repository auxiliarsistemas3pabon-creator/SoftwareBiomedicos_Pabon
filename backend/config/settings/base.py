"""
Configuración base de Django.

Las settings específicas de cada entorno (dev/prod) heredan de este archivo.
"""
import os
from datetime import timedelta
from pathlib import Path

import environ
from celery.schedules import crontab

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ---------------------------------------------------------------------------
# Lectura de variables de entorno
# ---------------------------------------------------------------------------
env = environ.Env(
    DJANGO_DEBUG=(bool, False),
    DJANGO_ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
    CORS_ALLOWED_ORIGINS=(list, []),
    CSRF_TRUSTED_ORIGINS=(list, []),
    CELERY_TASK_ALWAYS_EAGER=(bool, False),
    EMAIL_USE_TLS=(bool, True),
    AWS_QUERYSTRING_AUTH=(bool, True),
    MAINTENANCE_NOTIFICATION_EMAILS=(list, []),
)

# Carga .env si existe (en Docker se inyectan vía environment, en local desde archivo)
env_file = BASE_DIR / ".env"
if env_file.exists():
    environ.Env.read_env(str(env_file))

# ---------------------------------------------------------------------------
# Core Django
# ---------------------------------------------------------------------------
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", default="insecure-default-change-me")
DEBUG = env("DJANGO_DEBUG")
ALLOWED_HOSTS = env("DJANGO_ALLOWED_HOSTS")

# ---------------------------------------------------------------------------
# Apps
# ---------------------------------------------------------------------------
DJANGO_APPS = [
    # `daphne` debe ir antes de `django.contrib.staticfiles` para que
    # `runserver` use el servidor ASGI de Channels (soporta WebSockets).
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "channels",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "django_filters",
    "corsheaders",
    "drf_spectacular",
    "drf_spectacular_sidecar",
    "storages",
    "axes",
]

LOCAL_APPS: list[str] = [
    "users",
    "branches",
    "catalog",
    "equipment",
    "workorders",
    "maintenance",
    "scheduling",
    "failures",
    "audit",
    "realtime",
    # Las apps de dominio se irán agregando incrementalmente:
    # "apps.core",
]

AUTH_USER_MODEL = "users.User"

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "csp.middleware.CSPMiddleware",
    "axes.middleware.AxesMiddleware",
]

AUTHENTICATION_BACKENDS = [
    "axes.backends.AxesBackend",
    "django.contrib.auth.backends.ModelBackend",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", default="biometric_db"),
        "USER": os.getenv("POSTGRES_USER", default="biometric_user"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", default="biometric_pass"),
        "HOST": os.getenv("POSTGRES_HOST", default="localhost"),
        "PORT": os.getenv("POSTGRES_PORT", default="5432"),
    }
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Auth / Passwords
# ---------------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------------------------------------------------------------
# i18n / TZ
# ---------------------------------------------------------------------------
LANGUAGE_CODE = "es-co"
TIME_ZONE = "America/Bogota"
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static / Media
# ---------------------------------------------------------------------------
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# ---------------------------------------------------------------------------
# DRF
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "common.authentication.CookieJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "common.pagination.DefaultPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": os.getenv("THROTTLE_RATE_ANON", default="200/min"),
        "user": os.getenv("THROTTLE_RATE_USER", default="1000/min"),
        "login": os.getenv("THROTTLE_RATE_LOGIN", default="500/min"),
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=env.int("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", default=60)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=env.int("JWT_REFRESH_TOKEN_LIFETIME_DAYS", default=7)
    ),
    "AUTH_HEADER_TYPES": ("Bearer",),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

# ---------------------------------------------------------------------------
# Cookies de autenticación (frontend web)
# ---------------------------------------------------------------------------
# El frontend web recibe el access/refresh token como cookies httpOnly (no
# localStorage) para que un XSS no pueda robarlos ni suplantar al usuario.
# Los clientes que usan el header Authorization (app móvil, Postman, etc.)
# no se ven afectados: CookieJWTAuthentication sigue aceptando ese header y
# solo cae a la cookie cuando no viene header.
AUTH_COOKIE_ACCESS_NAME = "access_token"
AUTH_COOKIE_REFRESH_NAME = "refresh_token"
AUTH_COOKIE_SAMESITE = os.getenv("AUTH_COOKIE_SAMESITE", default="Lax")
# En prod.py se fuerza a True (HTTPS). En dev queda en False por defecto para
# no requerir HTTPS local; puede activarse por env si se prueba con HTTPS.
AUTH_COOKIE_SECURE = env.bool("AUTH_COOKIE_SECURE", default=False)

# La cookie `csrftoken` (usada por enforce_csrf en api/v1/common/authentication.py)
# tiene que poder viajar en el mismo tipo de request que access_token/
# refresh_token — si un despliegue cambia AUTH_COOKIE_SAMESITE a "None" para
# un escenario realmente cross-site pero esta cookie se queda en "Lax", el
# navegador manda las cookies de auth pero no la de CSRF, y todo mutating
# request autenticado por cookie empieza a fallar con "CSRF cookie not set".
CSRF_COOKIE_SAMESITE = AUTH_COOKIE_SAMESITE
SESSION_COOKIE_SAMESITE = AUTH_COOKIE_SAMESITE

SPECTACULAR_SETTINGS = {
    "TITLE": "Biometric API",
    "DESCRIPTION": "API para administración de equipos biomédicos",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    # Sirve los assets de Swagger/Redoc localmente (sin CDN externo) para
    # poder mantener una CSP estricta (default-src 'self').
    "SWAGGER_UI_DIST": "SIDECAR",
    "SWAGGER_UI_FAVICON_HREF": "SIDECAR",
    "REDOC_DIST": "SIDECAR",
}

# ---------------------------------------------------------------------------
# django-axes (bloqueo tras intentos fallidos de login)
# ---------------------------------------------------------------------------
AXES_FAILURE_LIMIT = env.int("AXES_FAILURE_LIMIT", default=5)
AXES_COOLOFF_TIME = env.int("AXES_COOLOFF_TIME_HOURS", default=1)
# Lockout por la COMBINACIÓN (username + ip_address), no por username solo:
# con ["username"] cualquier atacante no autenticado que conozca un username
# válido puede bloquear esa cuenta 1h enviando 5 intentos fallidos desde
# cualquier IP (DoS dirigido). Con [["username", "ip_address"]] el bloqueo
# solo aplica a ese par específico, así que un atacante no puede tumbar la
# cuenta de otra persona sin operar desde su misma IP.
AXES_LOCKOUT_PARAMETERS = [["username", "ip_address"]]
AXES_RESET_ON_SUCCESS = True

# ---------------------------------------------------------------------------
# Content-Security-Policy (django-csp)
# ---------------------------------------------------------------------------
CONTENT_SECURITY_POLICY = {
    "DIRECTIVES": {
        "default-src": ["'self'"],
        "img-src": ["'self'", "data:"],
        "style-src": ["'self'"],
        "script-src": ["'self'"],
        "frame-ancestors": ["'none'"],
        "object-src": ["'none'"],
    }
}

# ---------------------------------------------------------------------------
# CORS / CSRF (frontend web en otro puerto en dev: Vite :5173 → API :8000)
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS")
CSRF_TRUSTED_ORIGINS = os.getenv(
    "CSRF_TRUSTED_ORIGINS",
    default=env("CORS_ALLOWED_ORIGINS"),
)
# Credenciales (cookies httpOnly) exigen un origen concreto, nunca '*'.
# En prod nginx unifica origen y esto no se usa; en dev Vite puede proxear
# /api o hablar directo a :8000 (login desde localhost:5173).
CORS_ALLOW_CREDENTIALS = True

# ---------------------------------------------------------------------------
# AWS S3 (django-storages)
# ---------------------------------------------------------------------------
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", default="")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", default="")
AWS_STORAGE_BUCKET_NAME = os.getenv("AWS_STORAGE_BUCKET_NAME", default="")
AWS_S3_REGION_NAME = os.getenv("AWS_S3_REGION_NAME", default="us-east-1")
AWS_S3_CUSTOM_DOMAIN = os.getenv("AWS_S3_CUSTOM_DOMAIN", default="") or None
AWS_QUERYSTRING_AUTH = env("AWS_QUERYSTRING_AUTH")
AWS_DEFAULT_ACL = None  # Buckets modernos: ACLs deshabilitadas, se usan policies

# Storage backend solo si hay credenciales configuradas (default a local en dev sin S3)
if AWS_ACCESS_KEY_ID and AWS_STORAGE_BUCKET_NAME:
    STORAGES = {
        "default": {"BACKEND": "storages.backends.s3.S3Storage"},
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"
        },
    }
else:
    STORAGES = {
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"
        },
    }

# ---------------------------------------------------------------------------
# Frontend (para los enlaces que apuntan los QR)
# ---------------------------------------------------------------------------
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", default="http://127.0.0.1:5173")

# ---------------------------------------------------------------------------
# Email
# ---------------------------------------------------------------------------
EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    default="django.core.mail.backends.console.EmailBackend",
)
EMAIL_HOST = os.getenv("EMAIL_HOST", default="")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env("EMAIL_USE_TLS")
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = os.getenv(
    "DEFAULT_FROM_EMAIL",
    default="Biometric API <noreply@biometric.local>",
)

# ---------------------------------------------------------------------------
# Celery
# ---------------------------------------------------------------------------
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", default="redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.getenv(
    "CELERY_RESULT_BACKEND", default="redis://localhost:6379/1"
)
CELERY_TASK_ALWAYS_EAGER = env("CELERY_TASK_ALWAYS_EAGER")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_BEAT_SCHEDULE = {
    "verify-equipment-expiry-daily": {
        "task":"equipment.tasks.verify_equipment_expiry",
        "schedule":crontab(hour=8,minute=0),
    }
}

# ---------------------------------------------------------------------------
# Channels (WebSockets) — canal `/ws/notifications/`
# ---------------------------------------------------------------------------
# Reusa el mismo Redis que Celery pero en otra DB para no mezclar keys.
CHANNELS_REDIS_URL = os.getenv("CHANNELS_REDIS_URL", default="redis://localhost:6379/3")
# redis-py 8 default `socket_timeout=5` aborta el BZPOPMIN bloqueante de
# channels-redis (~5 s sin mensajes) y tumba `/ws/notifications/`.
# `None` restaura la espera indefinida que Channels necesita.
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [
                {
                    "address": CHANNELS_REDIS_URL,
                    "socket_timeout": None,
                }
            ],
        },
    }
}

# ----------------------------------------------------------------------------
# Notificaciones de vencimiento de garantia
# ----------------------------------------------------------------------------
EXPIRED_NOTIFICATION_EMAILS = os.getenv(
    "EXPIRED_NOTIFICATION_EMAILS",default=[]
)

# ---------------------------------------------------------------------------
# Notificaciones de mantenimiento
# ---------------------------------------------------------------------------
MAINTENANCE_NOTIFICATION_EMAILS = env("MAINTENANCE_NOTIFICATION_EMAILS")

# ---------------------------------------------------------------------------
# Logging (a stdout, apto para contenedores/Docker)
# ---------------------------------------------------------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "simple": {
            "format": "[{asctime}] {levelname} {name}: {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "simple",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": os.getenv("DJANGO_LOG_LEVEL", default="INFO"),
    },
    "loggers": {
        "django.request": {
            "handlers": ["console"],
            "level": "ERROR",
            "propagate": False,
        },
        "django.security": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
    },
}

# ---------------------------------------------------------------------------
# Sentry (captura de errores/monitoreo) — solo se activa si hay DSN
# ---------------------------------------------------------------------------
SENTRY_DSN = os.getenv("SENTRY_DSN", default="")
if SENTRY_DSN:
    import logging

    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=os.getenv("SENTRY_ENVIRONMENT", default="production"),
        integrations=[
            DjangoIntegration(),
            LoggingIntegration(level=None, event_level=logging.ERROR),
        ],
        traces_sample_rate=env.float("SENTRY_TRACES_SAMPLE_RATE", default=0.1),
        send_default_pii=False,
    )
