"""Pruebas de auditoría (`apps.audit.tests`).

`test_utils.py` cubre `log_audit_event`: persistencia del actor,
acción, modelo, cambios JSON e IP (`REMOTE_ADDR` /
`X-Forwarded-For`); actor anónimo queda nulo. No hay tests de API
porque este app no expone endpoints.
"""
