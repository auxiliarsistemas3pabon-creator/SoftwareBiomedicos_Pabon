"""Pruebas de usuarios (`apps.users.tests`).

- `test_api.py`: listado (admin ve todos; coordinador/ingeniero solo
  ingenieros y técnicos activos), CRUD, perfil `me`, no auto-borrar,
  solo superadmin opera sobre otro superadmin, no auto-cambiar rol.
- `test_auth_security.py`: JWT cookie/body, CSRF, axes.
- `test_models.py`: roles, email único, `is_admin_role`, `area`.
Factories y conftest,security.
"""
