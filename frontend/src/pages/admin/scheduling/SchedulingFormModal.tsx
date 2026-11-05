import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { TechnicianSelect } from "@/components/ui/TechnicianSelect";
import { assignmentPayload } from "@/lib/users";
import { KIND_LABEL } from "@/utils/scheduling.utils";
import type { ScheduleKind } from "@/types/scheduling/scheduling";
import type { SchedulingFormModalProps } from "@/types/scheduling/props";

export function SchedulingFormModal({
  open,
  onClose,
  editing,
  creating,
  isCoordinatorOrSuperadmin,
  form,
  setForm,
  onSubmit,
  saving,
  equipmentLabel,
  equipmentOptions,
  equipmentError,
  technicianListAvailable,
  technicians,
}: SchedulingFormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Programar solicitud" : "Nueva solicitud"}
      size="lg"
    >
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        {editing || (creating && isCoordinatorOrSuperadmin) ? (
          <div className="sm:col-span-2">
            <Input
              label="Equipo"
              value={
                editing
                  ? editing.equipment_name
                    ? `${editing.equipment_name}${
                        editing.equipment_asset_tag
                          ? ` (${editing.equipment_asset_tag})`
                          : ""
                      }`
                    : equipmentLabel(editing.equipment)
                  : equipmentLabel(form.equipment)
              }
              readOnly
              disabled
            />
          </div>
        ) : (
          <div className="sm:col-span-2">
            <Select
              label="Equipo"
              value={String(form.equipment)}
              onChange={(e) =>
                setForm({ ...form, equipment: Number(e.target.value) })
              }
              options={equipmentOptions}
              placeholder="Selecciona un equipo"
              required
              error={
                equipmentOptions.length === 0 && equipmentError
                  ? "No se pudieron cargar los equipos. Recarga la página e inténtalo de nuevo."
                  : undefined
              }
              hint={
                equipmentOptions.length === 0 && !equipmentError
                  ? "Aún no hay equipos registrados en el sistema."
                  : undefined
              }
            />
          </div>
        )}
        {editing || (creating && isCoordinatorOrSuperadmin) ? (
          <Input
            label="Tipo"
            value={KIND_LABEL[editing ? editing.kind : form.kind]}
            readOnly
            disabled
          />
        ) : (
          <Select
            label="Tipo"
            value={form.kind}
            onChange={(e) =>
              setForm({ ...form, kind: e.target.value as ScheduleKind })
            }
            options={Object.entries(KIND_LABEL).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        )}
        {editing ? (
          <Input
            label="Fecha programada"
            type="date"
            value={form.scheduled_date}
            onChange={(e) =>
              setForm({ ...form, scheduled_date: e.target.value })
            }
          />
        ) : (
          // Quien solicita no elige la fecha: siempre es la fecha del
          // sistema (ver `today()` en openCreate), de solo lectura.
          <Input
            label="Fecha de solicitud"
            type="date"
            value={form.requested_date}
            readOnly
            disabled
          />
        )}
        {editing && (
          <div className="sm:col-span-2">
            {technicianListAvailable ? (
              <TechnicianSelect
                label="Asignado a"
                value={
                  form.assigned_technician ?? form.assigned_engineer ?? null
                }
                onChange={(_id, user) =>
                  setForm({ ...form, ...assignmentPayload(user ?? null) })
                }
                technicians={technicians}
                hint="Ingeniero o usuario operativo. Opcional — puedes asignarlo más tarde."
              />
            ) : (
              <Input
                label="ID del asignado (opcional)"
                type="number"
                value={form.assigned_technician ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    assigned_technician: e.target.value
                      ? Number(e.target.value)
                      : null,
                    assigned_engineer: null,
                  })
                }
                hint="Tu rol no lista usuarios; deja vacío o escribe el ID del responsable."
              />
            )}
          </div>
        )}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-sm font-medium text-app">Notas</label>
          <textarea
            value={form.notes ?? ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-app bg-surface px-3 py-2.5 text-sm text-app outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {editing ? "Guardar" : "Crear"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
