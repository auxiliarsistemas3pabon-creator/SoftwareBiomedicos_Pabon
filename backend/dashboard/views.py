"""Endpoint agregado para el dashboard de la SPA.

Una sola request, una sola response. Las queries se aíslan en funciones helper para
testearlas independientemente del view.
"""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.db.models.functions import Coalesce, TruncMonth
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from equipment.models import (
    Equipment,
    EquipmentStatus,
    EquipmentWorkOrder,
    WorkOrderStatus,
)
from failures.models import FailureRecord, FailureSeverity
from maintenance.models import MaintenanceKind, MaintenanceRecord
from scheduling.models import MaintenanceSchedule
from scheduling.tasks import queue_overdue_alerts
from users.models import User


def _assignment_scope(user) -> Q | None:
    """Para el operativo (técnico), restringe métricas a lo asignado a él."""
    if getattr(user, "role", None) == User.Role.TECNICO:
        return Q(assigned_technician=user) | Q(assigned_engineer=user)
    return None

_MAINTENANCE_KINDS = [
    MaintenanceKind.PREVENTIVE,
    MaintenanceKind.CORRECTIVE,
    MaintenanceKind.REPAIR,
    MaintenanceKind.CALIBRATION,
    MaintenanceKind.INSPECTION,
]


def _equipment_kpis() -> dict:
    by_status = dict(
        Equipment.objects.values_list("status").annotate(count=Count("id"))
    )
    return {
        "active": by_status.get(EquipmentStatus.ACTIVE, 0),
        "in_maintenance": by_status.get(EquipmentStatus.IN_MAINTENANCE, 0),
        "in_repair": by_status.get(EquipmentStatus.IN_REPAIR, 0),
        "inactive": by_status.get(EquipmentStatus.INACTIVE, 0),
        "total": sum(by_status.values()),
    }


def _failures_kpis() -> dict:
    open_qs = FailureRecord.objects.filter(resolved=False)
    return {
        "critical_open": open_qs.filter(severity=FailureSeverity.CRITICAL).count(),
        "total_open": open_qs.count(),
    }


def _scheduling_kpis(today: date, scope: Q | None = None) -> dict:
    pending = MaintenanceSchedule.objects.filter(is_completed=False)
    if scope is not None:
        pending = pending.filter(scope)
    return {
        "next_7_days": pending.filter(
            scheduled_date__gte=today,
            scheduled_date__lte=today + timedelta(days=7),
        ).count(),
        "overdue": pending.filter(
            scheduled_date__isnull=False,
            scheduled_date__lte=today,
        ).count(),
    }


def _maintenance_kpis(today: date, scope: Q | None = None) -> dict:
    month_qs = MaintenanceRecord.objects.filter(
        date__year=today.year, date__month=today.month
    )
    if scope is not None:
        month_qs = month_qs.filter(scope)
    aggregate = month_qs.aggregate(
        count=Count("id"),
        cost=Coalesce(Sum("cost"), Decimal(0)),
    )
    return {
        "this_month_count": aggregate["count"],
        "this_month_cost": str(aggregate["cost"]),
    }


def _equipment_distribution() -> list[dict]:
    return [
        {"status": s, "count": Equipment.objects.filter(status=s).count()}
        for s in (
            EquipmentStatus.ACTIVE,
            EquipmentStatus.IN_MAINTENANCE,
            EquipmentStatus.IN_REPAIR,
            EquipmentStatus.INACTIVE,
        )
    ]


def _failures_distribution() -> list[dict]:
    rows = []
    for severity in (
        FailureSeverity.LOW,
        FailureSeverity.MEDIUM,
        FailureSeverity.HIGH,
        FailureSeverity.CRITICAL,
    ):
        qs = FailureRecord.objects.filter(severity=severity)
        rows.append(
            {
                "severity": severity,
                "open": qs.filter(resolved=False).count(),
                "resolved": qs.filter(resolved=True).count(),
            }
        )
    return rows


def _maintenance_time_series(today: date, scope: Q | None = None) -> list[dict]:
    # Construye una lista ordenada de los últimos 6 meses incluyendo el actual.
    months: list[date] = []
    cursor = today.replace(day=1)
    for _ in range(6):
        months.append(cursor)
        # Restar un mes manteniendo el día 1.
        if cursor.month == 1:
            cursor = cursor.replace(year=cursor.year - 1, month=12)
        else:
            cursor = cursor.replace(month=cursor.month - 1)
    months.reverse()

    start = months[0]
    records = MaintenanceRecord.objects.filter(date__gte=start)
    if scope is not None:
        records = records.filter(scope)
    rows = (
        records.annotate(bucket=TruncMonth("date"))
        .values("bucket", "kind")
        .annotate(count=Count("id"), cost=Coalesce(Sum("cost"), Decimal(0)))
    )

    by_month: dict[str, dict] = {
        m.isoformat()[:7]: {
            "month": m.isoformat()[:7],
            **{k: 0 for k in _MAINTENANCE_KINDS},
            "cost": Decimal(0),
        }
        for m in months
    }
    for row in rows:
        # TruncMonth sobre un DateField devuelve date; sobre DateTimeField devuelve datetime.
        bucket = row["bucket"]
        bucket_key = (bucket.date() if hasattr(bucket, "date") else bucket).isoformat()[:7]
        if bucket_key not in by_month:
            continue
        if row["kind"] in by_month[bucket_key]:
            by_month[bucket_key][row["kind"]] = row["count"]
        by_month[bucket_key]["cost"] += row["cost"]

    result = []
    for m in months:
        item = by_month[m.isoformat()[:7]]
        item["cost"] = str(item["cost"])
        result.append(item)
    return result


def _overdue_schedules(today: date, scope: Q | None = None) -> list[dict]:
    base = MaintenanceSchedule.objects.filter(
        is_completed=False,
        scheduled_date__isnull=False,
        scheduled_date__lte=today,
    )
    if scope is not None:
        base = base.filter(scope)
    qs = base.select_related("equipment").order_by("scheduled_date")[:10]
    return [
        {
            "id": s.id,
            "equipment_id": s.equipment_id,
            "equipment_name": s.equipment.name,
            "equipment_asset_tag": s.equipment.asset_tag,
            "scheduled_date": s.scheduled_date.isoformat(),
            "days_overdue": (today - s.scheduled_date).days,
            "kind": s.kind,
        }
        for s in qs
    ]


def _worst_mtbf() -> list[dict]:
    qs = (
        Equipment.objects.annotate(failures_count=Count("failures"))
        .filter(failures_count__gte=2, mtbf_hours__isnull=False)
        .select_related("branch")
        .order_by("mtbf_hours")[:5]
    )
    return [
        {
            "id": e.id,
            "name": e.name,
            "asset_tag": e.asset_tag,
            "branch_name": e.branch.name,
            "mtbf_hours": str(e.mtbf_hours),
            "failures_count": e.failures_count,
        }
        for e in qs
    ]


def _my_schedules(user, today: date) -> list[dict]:
    qs = (
        MaintenanceSchedule.objects.filter(
            is_completed=False,
            scheduled_date__gte=today,
            scheduled_date__lte=today + timedelta(days=7),
        )
        .filter(Q(assigned_technician=user) | Q(assigned_engineer=user))
        .select_related("equipment")
        .order_by("scheduled_date")[:10]
    )
    return [
        {
            "id": s.id,
            "equipment_id": s.equipment_id,
            "equipment_name": s.equipment.name,
            "equipment_asset_tag": s.equipment.asset_tag,
            "scheduled_date": s.scheduled_date.isoformat(),
            "kind": s.kind,
        }
        for s in qs
    ]


def _weekly_reports(user, today: date) -> dict:
    """Mantenimientos del operativo en la semana calendario, agrupados por área."""
    week_start = today - timedelta(days=today.weekday())
    qs = (
        MaintenanceRecord.objects.filter(
            date__gte=week_start,
            date__lte=today,
        )
        .filter(Q(assigned_technician=user) | Q(assigned_engineer=user))
        .select_related("equipment")
        .order_by("-date")
    )
    by_area: dict[str, int] = {}
    records = []
    for rec in qs:
        area = (getattr(rec.equipment, "area", None) or "").strip() or "Sin área"
        by_area[area] = by_area.get(area, 0) + 1
        records.append(
            {
                "id": rec.id,
                "date": rec.date.isoformat(),
                "kind": rec.kind,
                "equipment_name": rec.equipment.name,
                "equipment_asset_tag": rec.equipment.asset_tag,
                "area": area,
            }
        )
    return {
        "week_start": week_start.isoformat(),
        "week_end": today.isoformat(),
        "by_area": [{"area": k, "count": v} for k, v in sorted(by_area.items())],
        "records": records,
    }


def _opportunity_hours(rec: FailureRecord) -> float | None:
    if not rec.resolved or not rec.resolved_at or not rec.reported_at:
        return None
    seconds = (rec.resolved_at - rec.reported_at).total_seconds()
    if seconds < 0:
        return None
    return round(seconds / 3600, 1)


def _area_ops_dashboard(user, today: date) -> dict | None:
    """Dashboard personal: fallas del operativo o solicitudes del usuario."""
    from common.area_scope import operativo_area

    role = getattr(user, "role", None)
    if role == User.Role.USUARIO:
        return _usuario_requests_dashboard(user, today)
    if role != User.Role.TECNICO:
        return None
    area = operativo_area(user) or ""
    qs = FailureRecord.objects.select_related("equipment").filter(reported_by=user)
    if area:
        qs = qs.filter(equipment__area__iexact=area)
    else:
        qs = qs.none()
    week_start = today - timedelta(days=today.weekday())
    week_qs = qs.filter(reported_at__date__gte=week_start, reported_at__date__lte=today)
    by_status = [
        {"status": "open", "count": qs.filter(resolved=False).count()},
        {"status": "resolved", "count": qs.filter(resolved=True).count()},
    ]
    this_week_by_day = []
    cursor = week_start
    while cursor <= today:
        this_week_by_day.append(
            {
                "date": cursor.isoformat(),
                "count": week_qs.filter(reported_at__date=cursor).count(),
            }
        )
        cursor += timedelta(days=1)
    recent = [
        {
            "id": rec.id,
            "equipment_name": rec.equipment.name,
            "equipment_asset_tag": rec.equipment.asset_tag,
            "area": (rec.equipment.area or "").strip() or "Sin área",
            "severity": rec.severity,
            "resolved": rec.resolved,
            "reported_at": rec.reported_at.isoformat(),
            "resolution_notes": rec.resolution_notes or "",
            "opportunity_hours": _opportunity_hours(rec),
        }
        for rec in qs.order_by("-reported_at")[:25]
    ]
    return {
        "source": "failures",
        "area": area,
        "kpis": {
            "total": qs.count(),
            "open": qs.filter(resolved=False).count(),
            "resolved": qs.filter(resolved=True).count(),
            "this_week": week_qs.count(),
            "this_week_open": week_qs.filter(resolved=False).count(),
            "this_week_resolved": week_qs.filter(resolved=True).count(),
        },
        "by_status": by_status,
        "this_week_by_day": this_week_by_day,
        "recent": recent,
    }


_OPEN_WO = (WorkOrderStatus.PENDING, WorkOrderStatus.IN_PROGRESS)


def _engineer_tasks_dashboard(user) -> dict | None:
    """KPIs y cola de órdenes de trabajo asignadas al ingeniero biomédico."""
    if getattr(user, "role", None) != User.Role.INGENIERO:
        return None
    qs = EquipmentWorkOrder.objects.filter(technician=user).select_related(
        "equipment"
    )
    pending_qs = qs.filter(status__in=_OPEN_WO)
    pending_only = qs.filter(status=WorkOrderStatus.PENDING)
    in_progress_qs = qs.filter(status=WorkOrderStatus.IN_PROGRESS)
    recent = [
        {
            "id": wo.id,
            "number": wo.number,
            "equipment_name": wo.equipment.name,
            "equipment_asset_tag": wo.equipment.asset_tag,
            "service_type": wo.service_type,
            "status": wo.status,
            "start_date": wo.start_date.isoformat(),
            "description": wo.description,
        }
        for wo in pending_qs.order_by("start_date", "id")[:25]
    ]
    series = [
        {
            "status": wo.status,
            "start_date": timezone.localtime(wo.start_date).date().isoformat()
            if timezone.is_aware(wo.start_date)
            else wo.start_date.date().isoformat(),
            "end_date": (
                (
                    timezone.localtime(wo.end_date).date().isoformat()
                    if timezone.is_aware(wo.end_date)
                    else wo.end_date.date().isoformat()
                )
                if wo.end_date
                else None
            ),
        }
        for wo in qs.exclude(status=WorkOrderStatus.CANCELLED)
    ]
    return {
        "kpis": {
            "assigned": qs.exclude(status=WorkOrderStatus.CANCELLED).count(),
            "pending": pending_only.count(),
            "in_progress": in_progress_qs.count(),
            "resolved": qs.filter(status=WorkOrderStatus.FINISHED).count(),
        },
        "series": series,
        "recent": recent,
    }


def _usuario_requests_dashboard(user, today: date) -> dict:
    """Solicitudes que el usuario creó, para monitorear en el dashboard."""
    qs = MaintenanceSchedule.objects.select_related("equipment").filter(
        requested_by=user
    )
    week_start = today - timedelta(days=today.weekday())
    week_qs = qs.filter(
        requested_date__gte=week_start, requested_date__lte=today
    )
    by_status = [
        {"status": "open", "count": qs.filter(is_completed=False).count()},
        {"status": "resolved", "count": qs.filter(is_completed=True).count()},
    ]
    recent = [
        {
            "id": rec.id,
            "equipment_name": rec.equipment.name,
            "equipment_asset_tag": rec.equipment.asset_tag,
            "area": (getattr(rec.equipment, "area", None) or "").strip()
            or "Sin área",
            "severity": "MEDIUM",
            "resolved": rec.is_completed,
            "reported_at": rec.requested_date.isoformat(),
            "resolution_notes": rec.notes or "",
            "opportunity_hours": None,
        }
        for rec in qs.order_by("-requested_date", "-id")[:200]
    ]
    series = [
        {"date": d.isoformat(), "resolved": done}
        for d, done in qs.values_list("requested_date", "is_completed")
    ]
    return {
        "source": "schedules",
        "area": "",
        "kpis": {
            "total": qs.count(),
            "open": qs.filter(is_completed=False).count(),
            "resolved": qs.filter(is_completed=True).count(),
            "this_week": week_qs.count(),
            "this_week_open": week_qs.filter(is_completed=False).count(),
            "this_week_resolved": week_qs.filter(is_completed=True).count(),
        },
        "by_status": by_status,
        "this_week_by_day": [],
        "series": series,
        "recent": recent,
    }


def _schedule_series(today: date) -> list[dict]:
    """Puntos de solicitudes para el dashboard del coordinador."""
    window_start = today - timedelta(days=730)
    return [
        {
            "date": d.isoformat(),
            "kind": kind,
            "resolved": done,
        }
        for d, kind, done in MaintenanceSchedule.objects.filter(
            requested_date__gte=window_start
        ).values_list("requested_date", "kind", "is_completed")
    ]


def _maintenance_cost_series(today: date) -> list[dict]:
    """Costos de mantenimiento para el gráfico del coordinador."""
    window_start = today - timedelta(days=730)
    return [
        {"date": d.isoformat(), "cost": str(c or 0)}
        for d, c in MaintenanceRecord.objects.filter(
            date__gte=window_start
        ).values_list("date", "cost")
    ]


class DashboardSummaryView(APIView):
    """Snapshot agregado para el dashboard. Sin cache en v1."""

    permission_classes = (IsAuthenticated,)

    def get(self, request):
        today = timezone.localdate()
        # Para el técnico, las métricas de trabajo se acotan a lo suyo.
        scope = _assignment_scope(request.user)
        payload = {
            "kpis": {
                "equipment": _equipment_kpis(),
                "failures": _failures_kpis(),
                "scheduling": _scheduling_kpis(today, scope),
                "maintenance": _maintenance_kpis(today, scope),
            },
            "distributions": {
                "equipment_by_status": _equipment_distribution(),
                "failures_by_severity": _failures_distribution(),
            },
            "time_series": {
                "maintenance_by_month": _maintenance_time_series(today, scope),
                "schedules": (
                    _schedule_series(today)
                    if getattr(request.user, "role", None)
                    in (User.Role.COORDINADOR, User.Role.SUPERADMIN)
                    else []
                ),
                "maintenance_costs": (
                    _maintenance_cost_series(today)
                    if getattr(request.user, "role", None)
                    in (User.Role.COORDINADOR, User.Role.SUPERADMIN)
                    else []
                ),
            },
            "lists": {
                "overdue_schedules": _overdue_schedules(today, scope),
                "worst_mtbf": _worst_mtbf(),
            },
            "my_tasks": {
                "schedules": _my_schedules(request.user, today),
                # FailureRecord no tiene "assigned_to" en v1; se reserva la key
                # para futuro sin obligar al frontend a defenderse contra ausencia.
                "failures": [],
            },
            "my_week": (
                _weekly_reports(request.user, today)
                if getattr(request.user, "role", None) == User.Role.TECNICO
                else None
            ),
            "area_ops": _area_ops_dashboard(request.user, today),
            "engineer_tasks": _engineer_tasks_dashboard(request.user),
        }
        if payload["kpis"]["scheduling"]["overdue"] > 0:
            try:
                queue_overdue_alerts.delay()
            except Exception:
                pass
        return Response(payload)


__all__ = ["DashboardSummaryView"]
