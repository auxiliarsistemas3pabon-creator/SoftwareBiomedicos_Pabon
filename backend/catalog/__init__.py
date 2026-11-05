"""Catálogo de marcas y modelos (`apps.catalog`).

- `Brand`: nombre único, `is_active`.
- `EquipmentModel`: pertenece a una marca; unicidad (marca, nombre);
  `is_active` para ocultar sin borrar.

`Equipment.model` apunta aquí con PROTECT: no se borra un modelo que
tenga equipos, ni una marca que tenga modelos (eso lo refuerza la
API con 409). El HTTP está en `api.v1.catalog` con permiso del
recurso `equipment` (quien gestiona inventario gestiona el catálogo).
Admin Django en `admin.py`.
"""
