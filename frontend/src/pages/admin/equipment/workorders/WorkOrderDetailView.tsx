import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { workOrdersService } from "@/services/workorders.service";
import type { WorkOrderDetail } from "@/types/equipment/workorder";
import { WorkOrderInfo } from "@/pages/admin/equipment/workorders/WorkOrderInfo";
import { ChildSection, CostSection } from "@/pages/admin/equipment/workorders/WorkOrderSections";
import { EVIDENCE_LABEL, SIGNATURE_LABEL } from "@/utils/workorder.utils";

// ---------------------------------------------------------------------------
// Detalle de una orden: repuestos / mediciones / evidencias / firmas / costos
// ---------------------------------------------------------------------------

export function WorkOrderDetailView({
  detail,
  loading,
  canEdit,
  onChanged,
  onRealizarMantenimiento,
}: {
  detail: WorkOrderDetail;
  loading: boolean;
  canEdit: boolean;
  onChanged: () => Promise<void>;
  /** Si se define, se muestra el botón para cerrar la orden desde el detalle. */
  onRealizarMantenimiento?: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <WorkOrderInfo w={detail} />

      {onRealizarMantenimiento && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="text-sm text-app-muted">
            Cuando termines el trabajo, márcalo como realizado para dejarlo en la
            hoja de vida del equipo.
          </p>
          <Button
            size="sm"
            leftIcon={<Wrench size={14} />}
            onClick={onRealizarMantenimiento}
          >
            Realizar mantenimiento
          </Button>
        </div>
      )}

      {loading && (
        <p className="text-sm text-app-muted">Cargando elementos...</p>
      )}

      <ChildSection
        title="Repuestos"
        rows={detail.spare_parts ?? []}
        columns={["Nombre", "Ref.", "Cant.", "C. unit.", "Total"]}
        renderRow={(r) => [r.name, r.reference, r.quantity, r.unit_cost, r.total_cost]}
        canEdit={canEdit}
        fields={[
          { name: "name", label: "Nombre", required: true },
          { name: "reference", label: "Referencia", required: true },
          { name: "quantity", label: "Cantidad", type: "number", required: true },
          { name: "unit_cost", label: "Costo unitario", type: "number", required: true },
        ]}
        onAdd={(data) =>
          workOrdersService.sparePart.create({
            work_order: detail.id,
            ...data,
          })
        }
        onRemove={(id) => workOrdersService.sparePart.remove(id)}
        onChanged={onChanged}
      />

      <ChildSection
        title="Mediciones"
        rows={detail.measurements ?? []}
        columns={["Parámetro", "Esperado", "Medido", "Unidad", "OK"]}
        renderRow={(r) => [
          r.parameter,
          r.expected_value,
          r.measured_value,
          r.unit,
          r.passed ? "Sí" : "No",
        ]}
        canEdit={canEdit}
        fields={[
          { name: "parameter", label: "Parámetro", required: true },
          { name: "expected_value", label: "Valor esperado", required: true },
          { name: "measured_value", label: "Valor medido", required: true },
          { name: "unit", label: "Unidad", required: true },
          {
            name: "passed",
            label: "¿Pasa?",
            type: "select",
            options: [
              { value: "true", label: "Sí" },
              { value: "false", label: "No" },
            ],
          },
        ]}
        onAdd={(data) =>
          workOrdersService.measurement.create({
            work_order: detail.id,
            ...data,
            passed: data.passed === undefined ? true : data.passed === "true",
          })
        }
        onRemove={(id) => workOrdersService.measurement.remove(id)}
        onChanged={onChanged}
      />

      <ChildSection
        title="Evidencias"
        rows={detail.evidences ?? []}
        columns={["Tipo", "Descripción"]}
        renderRow={(r) => [
          EVIDENCE_LABEL[r.evidence_type] ?? r.evidence_type,
          r.description,
        ]}
        canEdit={canEdit}
        fields={[
          {
            name: "evidence_type",
            label: "Tipo",
            type: "select",
            options: Object.entries(EVIDENCE_LABEL).map(([value, label]) => ({
              value,
              label,
            })),
            required: true,
          },
          { name: "description", label: "Descripción", required: true },
        ]}
        onAdd={(data) =>
          workOrdersService.evidence.create({
            work_order: detail.id,
            ...data,
          })
        }
        onRemove={(id) => workOrdersService.evidence.remove(id)}
        onChanged={onChanged}
      />

      <ChildSection
        title="Firmas"
        rows={detail.signatures ?? []}
        columns={["Rol", "Firmó", "Fecha"]}
        renderRow={(r) => [
          SIGNATURE_LABEL[r.role] ?? r.role,
          r.signed_by,
          r.signed_at ? new Date(r.signed_at).toLocaleString() : "",
        ]}
        canEdit={canEdit}
        fields={[
          {
            name: "role",
            label: "Rol",
            type: "select",
            options: Object.entries(SIGNATURE_LABEL).map(([value, label]) => ({
              value,
              label,
            })),
            required: true,
          },
          { name: "signed_by", label: "Nombre de quien firma", required: true },
        ]}
        onAdd={(data) =>
          workOrdersService.signature.create({
            work_order: detail.id,
            ...data,
          })
        }
        onRemove={(id) => workOrdersService.signature.remove(id)}
        onChanged={onChanged}
      />

      <CostSection detail={detail} canEdit={canEdit} onChanged={onChanged} />
    </div>
  );
}
