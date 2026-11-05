"""Cálculo de métricas de confiabilidad por equipo (MTBF y MTTR).

Las definiciones operacionales y los casos borde están documentados en
``docs/plans/11-equipment-reliability-metrics.md``.
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from equipment.models import Equipment


_SECONDS_PER_HOUR = Decimal(3600)
_QUANT = Decimal("0.01")


def _to_hours(seconds: Decimal) -> Decimal:
    return (seconds / _SECONDS_PER_HOUR).quantize(_QUANT, rounding=ROUND_HALF_UP)


def compute_metrics(equipment: Equipment) -> tuple[Decimal | None, Decimal | None]:
    """Devuelve (mtbf_hours, mttr_hours) sin persistir.

    - MTBF: promedio de los intervalos entre fallas consecutivas (ordenadas por
      ``reported_at``). ``None`` si hay menos de dos fallas.
    - MTTR: promedio de ``resolved_at - reported_at`` sobre fallas resueltas.
      ``None`` si no hay ninguna resuelta. Intervalos negativos (datos inconsistentes)
      se descartan del promedio.
    """
    reported_dates = list(
        equipment.failures.order_by("reported_at").values_list("reported_at", flat=True)
    )

    mtbf: Decimal | None
    if len(reported_dates) < 2:
        mtbf = None
    else:
        deltas = [
            Decimal((reported_dates[i] - reported_dates[i - 1]).total_seconds())
            for i in range(1, len(reported_dates))
        ]
        mtbf = _to_hours(sum(deltas, Decimal(0)) / len(deltas))

    resolved_pairs = list(
        equipment.failures.filter(
            resolved=True, resolved_at__isnull=False
        ).values_list("reported_at", "resolved_at")
    )
    valid_deltas = [
        Decimal((resolved_at - reported_at).total_seconds())
        for reported_at, resolved_at in resolved_pairs
        if resolved_at >= reported_at
    ]
    mttr = (
        _to_hours(sum(valid_deltas, Decimal(0)) / len(valid_deltas))
        if valid_deltas
        else None
    )

    return mtbf, mttr


def recompute_for(equipment: Equipment) -> None:
    """Calcula y persiste las métricas para ``equipment`` en una sola query."""
    mtbf, mttr = compute_metrics(equipment)
    if equipment.mtbf_hours == mtbf and equipment.mttr_hours == mttr:
        return
    equipment.mtbf_hours = mtbf
    equipment.mttr_hours = mttr
    equipment.save(update_fields=["mtbf_hours", "mttr_hours", "updated_at"])
