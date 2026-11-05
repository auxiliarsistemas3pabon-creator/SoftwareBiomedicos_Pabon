"""Bases de `class Meta` que existen para el comprobador de tipos.

En ejecución DRF y factory_boy quitan `Meta` de la clase base, así que heredarla
directo rompe el import. Aquí, en ejecución, la base es `object` (igual que un
`class Meta` normal). El comprobador ve la `Meta` declarada en los stubs.
"""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from factory.django import DjangoModelFactory
    from rest_framework import serializers

    ModelSerializerMeta = serializers.ModelSerializer.Meta
    FactoryMeta = DjangoModelFactory.Meta
else:
    ModelSerializerMeta = object
    FactoryMeta = object
