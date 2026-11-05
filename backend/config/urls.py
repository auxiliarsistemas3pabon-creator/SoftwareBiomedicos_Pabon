"""
URLConf raíz del proyecto.

Las rutas de la API se versionan bajo /api/v1/.
"""
from urllib.parse import urlparse, urlunparse

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.shortcuts import redirect
from django.urls import include, path, re_path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework_simplejwt.views import (
    TokenBlacklistView,
    TokenRefreshView,
    TokenVerifyView,
)

from common.views import (
    CookieTokenLogoutView,
    CookieTokenObtainPairView,
    CookieTokenRefreshView,
    HealthView,
    ThrottledTokenObtainPairView,
)

_LOOPBACK = {"localhost", "127.0.0.1", "0.0.0.0"}


def redirect_to_frontend_home(request, leftover=None):
    """/admin apunta a la HomePage pública del frontend, no al admin de Django."""
    parsed = urlparse(settings.FRONTEND_BASE_URL)
    request_host = request.get_host().split(":")[0]
    frontend_host = (parsed.hostname or "").lower()
    if request_host.lower() in _LOOPBACK and frontend_host in _LOOPBACK:
        netloc = f"{request_host}:{parsed.port}" if parsed.port else request_host
        return redirect(urlunparse((parsed.scheme or "http", netloc, "/", "", "", "")))
    return redirect(settings.FRONTEND_BASE_URL.rstrip("/") + "/")


urlpatterns = [
    re_path(r"^admin(/.*)?$", redirect_to_frontend_home),
    path("django-admin/", admin.site.urls),
    # API v1 (las rutas de cada app se irán incluyendo a medida que se creen)
    # OpenAPI / Swagger
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
    path("api/v1/health/", HealthView.as_view(), name="health"),
    # JWT auth "clásico": tokens en el body. Para clientes sin cookies del
    # navegador (app móvil, Postman, scripts).
    path("api/v1/auth/token/", ThrottledTokenObtainPairView.as_view(), name="token-obtain"),
    path("api/v1/auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("api/v1/auth/token/verify/", TokenVerifyView.as_view(), name="token-verify"),
    path("api/v1/auth/token/blacklist/", TokenBlacklistView.as_view(), name="token-blacklist"),
    # JWT vía cookies httpOnly + CSRF. Solo para el frontend web — ver
    path(
        "api/v1/auth/token/cookie/",
        CookieTokenObtainPairView.as_view(),
        name="token-obtain-cookie",
    ),
    path(
        "api/v1/auth/token/cookie/refresh/",
        CookieTokenRefreshView.as_view(),
        name="token-refresh-cookie",
    ),
    path(
        "api/v1/auth/token/cookie/logout/",
        CookieTokenLogoutView.as_view(),
        name="token-logout-cookie",
    ),
    # Domain routes
    path("api/v1/users/", include(("users.urls", "users"), namespace="users")),
    path("api/v1/branches/", include(("branches.urls", "branches"), namespace="branches")),
    path("api/v1/catalog/", include(("catalog.urls", "catalog"), namespace="catalog")),
    path("api/v1/equipment/", include(("equipment.urls", "equipment"), namespace="equipment")),
    path(
        "api/v1/maintenance/",
        include(("maintenance.urls", "maintenance"), namespace="maintenance"),
    ),
    path(
        "api/v1/scheduling/",
        include(("scheduling.urls", "scheduling"), namespace="scheduling"),
    ),
    path(
        "api/v1/failures/",
        include(("failures.urls", "failures"), namespace="failures"),
    ),
    path(
        "api/v1/dashboard/",
        include(("dashboard.urls", "dashboard"), namespace="dashboard"),
    ),
]

if settings.DEBUG:
    # Servir archivos subidos por FileSystemStorage durante el desarrollo.
    # En prod se usa S3 o un reverse-proxy que sirve /media directamente.
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    if "debug_toolbar" in settings.INSTALLED_APPS:
        urlpatterns += [path("__debug__/", include("debug_toolbar.urls"))]
