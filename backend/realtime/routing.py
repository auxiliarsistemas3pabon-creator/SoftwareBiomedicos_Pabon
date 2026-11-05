from django.urls.resolvers import RegexPattern, URLPattern

from .consumers import NotificationConsumer

# Igual que django.urls.re_path: RegexPattern + URLPattern. El callback es la
# app ASGI del consumer; URLRouter la usa así y re_path no acepta ese tipo.
websocket_urlpatterns = [
    URLPattern(
        RegexPattern(r"^ws/notifications/$", name=None, is_endpoint=True),
        NotificationConsumer.as_asgi(),
        None,
        None,
    ),
]
