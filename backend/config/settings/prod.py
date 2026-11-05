"""
Settings de producción.

Endurece la seguridad y desactiva DEBUG. Las variables sensibles deben venir
exclusivamente de variables de entorno.
"""
from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F401,F403

DEBUG = False

# Validacion secret
# La longitud mínima (50, recomendación de Django: ver check security.W009)
# importa en la práctica: SIMPLE_JWT usa SECRET_KEY como clave de firma HS256
# por defecto, y PyJWT emite InsecureKeyLengthWarning con claves debajo de 32
# bytes. `SECRET_KEY` viene de `from .base import *` de arriba.
if (  # noqa: F405
    not SECRET_KEY  # noqa: F405
    or SECRET_KEY == "insecure-default-change-me"  # noqa: F405
    or len(SECRET_KEY) < 50  # noqa: F405
):
    raise ImproperlyConfigured

# Seguridad
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
AUTH_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30  # 30 días
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
