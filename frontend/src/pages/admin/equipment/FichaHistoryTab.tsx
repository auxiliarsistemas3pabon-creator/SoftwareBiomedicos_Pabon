import { FileText, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { assignedRoleLabel, assignedUserName } from "@/lib/users";
import type { FichaHistoryTabProps } from "@/types/equipment/ficha";
import { KIND_LABEL, KIND_TONE } from "@/utils/ficha.utils";

export function FichaHistoryTab({
  loadingH,
  history,
}: FichaHistoryTabProps) {
  return (
    <div className="flex flex-col gap-2">
      {loadingH ? (
        <p className="py-6 text-center text-sm text-app-muted">Cargando...</p>
      ) : history.length === 0 ? (
        <p className="py-6 text-center text-sm text-app-muted">
          Este equipo aún no tiene mantenimientos registrados.
        </p>
      ) : (
        history.map((m) => {
          // El responsable puede ser técnico O ingeniero (a veces
          // asignado directamente por un coordinador/admin/superadmin
          // al registrar el mantenimiento) — el rol se etiqueta según
          // quién quedó asignado, en vez de asumir siempre "Técnico".
          const responsableDetail =
            m.assigned_technician_detail ?? m.assigned_engineer_detail;
          const responsableRole = assignedRoleLabel(responsableDetail);
          const responsableName =
            assignedUserName(responsableDetail) ??
            (m.technician?.trim() || "—");
          return (
          <div
            key={m.id}
            className="flex flex-col gap-2 rounded-lg border border-app bg-app-muted p-3 sm:flex-row sm:items-start sm:gap-4"
          >
            <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Wrench size={16} />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={KIND_TONE[m.kind]}>{KIND_LABEL[m.kind]}</Badge>
                <span className="text-xs text-app-muted">{m.date}</span>
                <span className="text-xs text-app-muted">
                  {responsableRole}:{" "}
                  <span className="text-app">{responsableName}</span>
                </span>
                {m.cost && (
                  <span className="text-xs text-app-muted">
                    Costo: <span className="text-app">${m.cost}</span>
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-app">{m.description}</p>
              {m.observations && (
                <div className="mt-1.5 rounded-md border-l-2 border-primary/40 bg-surface px-2.5 py-1.5">
                  <p className="text-xs font-medium text-app-muted">
                    Observaciones
                  </p>
                  <p className="mt-0.5 whitespace-pre-line text-sm text-app">
                    {m.observations}
                  </p>
                </div>
              )}
            </div>
            {m.pdf_file_url && (
              <a
                href={m.pdf_file_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 self-start rounded-lg border border-app bg-surface px-2.5 py-1 text-xs font-medium text-app hover:bg-primary/10 hover:text-primary"
              >
                <FileText size={12} /> PDF
              </a>
            )}
          </div>
          );
        })
      )}
    </div>
  );
}
