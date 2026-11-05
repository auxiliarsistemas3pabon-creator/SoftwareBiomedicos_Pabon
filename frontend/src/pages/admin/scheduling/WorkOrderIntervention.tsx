import type { WorkOrderInterventionProps } from "@/types/scheduling/props";

export function WorkOrderIntervention({
  woLoading,
  woDetail,
}: WorkOrderInterventionProps) {
  return (
    <div className="sm:col-span-2 border-t border-app pt-4">
      {woLoading && !woDetail ? (
        <p className="text-sm text-app-muted">Cargando intervención...</p>
      ) : woDetail ? (
        <div className="grid gap-3 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-app-muted">
            Intervención · Orden {woDetail.number}
          </p>
          <div>
            <p className="font-semibold text-app">Repuestos</p>
            {(woDetail.spare_parts ?? []).length === 0 ? (
              <p className="text-xs text-app-muted">Sin registros.</p>
            ) : (
              (woDetail.spare_parts ?? []).map((r) => (
                <p key={r.id} className="text-app">
                  {r.name} · {r.reference} · x{r.quantity} · $
                  {r.total_cost}
                </p>
              ))
            )}
          </div>
          <div>
            <p className="font-semibold text-app">Mediciones</p>
            {(woDetail.measurements ?? []).length === 0 ? (
              <p className="text-xs text-app-muted">Sin registros.</p>
            ) : (
              (woDetail.measurements ?? []).map((r) => (
                <p key={r.id} className="text-app">
                  {r.parameter}: {r.measured_value} {r.unit} (esp.{" "}
                  {r.expected_value}) {r.passed ? "OK" : "No"}
                </p>
              ))
            )}
          </div>
          <div>
            <p className="font-semibold text-app">Evidencias</p>
            {(woDetail.evidences ?? []).length === 0 ? (
              <p className="text-xs text-app-muted">Sin registros.</p>
            ) : (
              (woDetail.evidences ?? []).map((r) => (
                <p key={r.id} className="text-app">
                  {r.evidence_type}: {r.description}
                </p>
              ))
            )}
          </div>
          <div>
            <p className="font-semibold text-app">Firmas</p>
            {(woDetail.signatures ?? []).length === 0 ? (
              <p className="text-xs text-app-muted">Sin registros.</p>
            ) : (
              (woDetail.signatures ?? []).map((r) => (
                <p key={r.id} className="text-app">
                  {r.signed_by}
                  {r.signed_at
                    ? ` · ${new Date(r.signed_at).toLocaleString()}`
                    : ""}
                </p>
              ))
            )}
          </div>
          <div>
            <p className="font-semibold text-app">Costos</p>
            {woDetail.cost ? (
              <p className="text-app">
                Mano de obra ${woDetail.cost.labor_cost} · Repuestos $
                {woDetail.cost.spare_parts_cost} · Transporte $
                {woDetail.cost.transport_cost} · Otros $
                {woDetail.cost.other_cost} · Total $
                {woDetail.cost.total ?? "—"}
              </p>
            ) : (
              <p className="text-xs text-app-muted">
                Sin costos registrados.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
