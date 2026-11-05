"""Pruebas de sedes (`apps.branches.tests`).

`test_api.py`: CRUD REST, permisos por rol y 409 al borrar una sede
que aún tiene equipos (PROTECT). `test_models.py`: unicidad de
nombre, normalización de email vacío a NULL. Factories y conftest
arman usuarios admin/técnico y el APIClient.
"""
