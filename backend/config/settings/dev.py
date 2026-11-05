"""
Settings de desarrollo local.
"""
from .base import *  # noqa: F401,F403
from .base import INSTALLED_APPS, MIDDLEWARE

DEBUG = True

# Debug toolbar (opcional, solo si está instalado)
try:
    import debug_toolbar  # noqa: F401

    INSTALLED_APPS += ["debug_toolbar"]
    MIDDLEWARE = [
        "debug_toolbar.middleware.DebugToolbarMiddleware",
        *MIDDLEWARE,
    ]
    INTERNAL_IPS = ["127.0.0.1", "localhost"]
except ImportError:
    pass

# Orígenes explícitos + credenciales. CORS_ALLOW_ALL_ORIGINS=True manda
# Access-Control-Allow-Origin: * y el navegador bloquea withCredentials.
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True

# CSP relajada en dev: debug_toolbar y el navegador de la API de DRF inyectan
# estilos/scripts inline que la CSP estricta de base.py bloquearía.
CONTENT_SECURITY_POLICY = {
    "DIRECTIVES": {
        "default-src": ["'self'"],
        "img-src": ["'self'", "data:"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "script-src": ["'self'", "'unsafe-inline'"],
        "frame-ancestors": ["'none'"],
        "object-src": ["'none'"],
    }
}
