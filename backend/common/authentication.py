from django.conf import settings
from django.http import HttpRequest, HttpResponse
from rest_framework import exceptions
from rest_framework.authentication import CSRFCheck
from rest_framework_simplejwt.authentication import JWTAuthentication

SAFE_METHODS = ("GET", "HEAD", "OPTIONS", "TRACE")


def enforce_csrf(request) -> None:
    """Corre la misma validación CSRF que usa `SessionAuthentication` de DRF.

    Solo debe invocarse cuando el token de acceso viaja en una cookie: en
    ese escenario el navegador la adjunta automáticamente a cualquier
    request (incluidos los originados desde otro sitio), así que hace falta
    el doble-submit de CSRF. Cuando el token viaja en el header
    `Authorization` (apps móviles, clientes API) no aplica: el atacante no
    puede forzar a un navegador a mandar ese header.
    """
    # process_view solo mira callback.csrf_exempt (getattr) y no llama a
    # get_response ni al callback. Una vista sin csrf_exempt equivale a None.
    def _csrf_unused(request: HttpRequest) -> HttpResponse:
        return HttpResponse()

    check = CSRFCheck(_csrf_unused)
    check.process_request(request)
    reason = check.process_view(request, _csrf_unused, (), {})
    if reason:
        raise exceptions.PermissionDenied(f"CSRF Failed: {reason}")


class CookieJWTAuthentication(JWTAuthentication):
    """JWT vía header `Authorization: Bearer <token>` (comportamiento
    estándar, usado por la app móvil) o, si no hay header, vía la cookie
    httpOnly `access_token` (usada por el frontend web para que un XSS no
    pueda leer el token desde `localStorage`)."""

    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
        else:
            raw_token = request.COOKIES.get(settings.AUTH_COOKIE_ACCESS_NAME)

        if raw_token is None:
            return None

        # La cookie llega como str; el header Authorization ya es bytes.
        # PyJWT trata ambos igual (codifica str a utf-8 antes de validar).
        if isinstance(raw_token, str):
            raw_token = raw_token.encode()
        validated_token = self.get_validated_token(raw_token)

        # CSRFCheck ya no-opea para métodos seguros, pero evitamos armar el
        # objeto y correrlo igual en cada GET/HEAD/OPTIONS autenticado.
        if header is None and request.method not in SAFE_METHODS:
            enforce_csrf(request)

        return self.get_user(validated_token), validated_token
