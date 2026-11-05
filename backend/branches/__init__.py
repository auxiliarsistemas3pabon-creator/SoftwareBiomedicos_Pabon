"""Sedes (`apps.branches`).

Modelo `Branch`: nombre único, dirección, ciudad, teléfono, email
opcional único (cadena vacía se normaliza a NULL para que Postgres
acepte varios “sin email”) y flag activa/inactiva.

`Equipment.branch` es PROTECT: no se borra una sede que todavía tenga
equipos. El HTTP está en `api.v1.branches` (CRUD, 409 al borrar con
equipos). Admin Django en `admin.py`; managers en `managers.py`.
"""
