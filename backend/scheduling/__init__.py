"""Solicitudes de mantenimiento (`apps.scheduling`).

Modelo `MaintenanceSchedule`: equipo, tipo (preventivo / reparación),
`requested_by` / `requested_date` al crear, `scheduled_date` opcional
(la gestión la pone al programar), un responsable (ingeniero o
técnico), notas, `is_completed`, `notified_at`, `auto_generated` y
`generated_from`.

Señales (`signals.py`):
- Asignar responsable crea o reasigna `EquipmentWorkOrder` (OneToOne
  `schedule`) y sincroniza el estado del equipo (En mantenimiento /
  En reparación / Operativo según tipo y OT abiertas).
- Al FINISHED de la OT la solicitud queda cumplida.
- Email Celery al crear o cambiar asignación.

Tareas (`tasks.py`):
- `send_schedule_notification`: correo y luego WS `schedule_email_sent`.
- `queue_overdue_alerts` / `send_overdue_alert`: cola de avisos WS
  `overdue_maintenance` (lock 60 s, una alerta/día por solicitud,
  stagger entre envíos).

HTTP en `api.v1.scheduling` (CRUD, `complete`, `notify`).
"""
