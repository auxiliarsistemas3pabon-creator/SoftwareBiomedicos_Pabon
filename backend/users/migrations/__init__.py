"""Migraciones de usuarios (`apps.users.migrations`).

- `0001_initial`: `User` (AbstractUser) + choices de rol.
- `0002`: renombra el choice legado `usuario` → `tecnico` (operativo).
- `0003`: campo `area` del operativo.
- `0004`: etiqueta visible “Usuario operativo” para `tecnico`.
- `0005`: reintroduce el choice `usuario` (solicitante) distinto del
  operativo.
  - Las migraciones de users
"""
