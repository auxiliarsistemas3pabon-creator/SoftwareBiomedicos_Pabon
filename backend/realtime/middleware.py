"""Autenticación del handshake WebSocket vía la cookie httpOnly `access_token`.

El frontend web NO manda el JWT por query string (quedaría en logs de proxy e
historial del navegador); viaja en la cookie httpOnly `access_token`, que el
navegador adjunta al handshake por ser same-site. Este middleware la lee,
valida el JWT y deja el usuario en `scope["user"]`. La app móvil usa el header
`Authorization: Bearer` igual que en la API REST.
"""
from http.cookies import SimpleCookie

from channels.auth import UserLazyObject
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

_jwt_auth = JWTAuthentication()


@database_sync_to_async
def _user_from_token(raw_token: str):
    try:
        validated = _jwt_auth.get_validated_token(raw_token.encode())
        return _jwt_auth.get_user(validated)
    except (InvalidToken, TokenError, KeyError):
        return AnonymousUser()


def _raw_token_from_scope(scope) -> str | None:
    headers = dict(scope.get("headers") or [])

    auth = headers.get(b"authorization", b"").decode()
    if auth.lower().startswith("bearer "):
        return auth[7:].strip() or None

    cookie_header = headers.get(b"cookie", b"").decode()
    if not cookie_header:
        return None
    jar = SimpleCookie()
    jar.load(cookie_header)
    morsel = jar.get(settings.AUTH_COOKIE_ACCESS_NAME)
    return morsel.value if morsel else None


class CookieJWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        raw_token = _raw_token_from_scope(scope)
        resolved = await _user_from_token(raw_token) if raw_token else AnonymousUser()
        # El tipo del scope pide UserLazyObject. El consumer solo lee
        # is_authenticated, que el lazy object reenvía al usuario real.
        user = UserLazyObject()
        user._wrapped = resolved
        scope["user"] = user
        return await super().__call__(scope, receive, send)
