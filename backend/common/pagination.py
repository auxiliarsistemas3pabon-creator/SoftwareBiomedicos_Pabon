"""Paginación por defecto de la API.

`PageNumberPagination` de fábrica ignora `?page_size=`, así que el cliente no
puede pedir un tamaño de página distinto al `PAGE_SIZE` global. El frontend
(p. ej. la tabla de equipos) sí lo envía; sin esto, pedía 10 y recibía 20, y
la paginación de la tabla quedaba descuadrada.
"""

from rest_framework.pagination import PageNumberPagination


class DefaultPagination(PageNumberPagination):
    page_size_query_param = "page_size"
    max_page_size = 200


__all__ = ["DefaultPagination"]
