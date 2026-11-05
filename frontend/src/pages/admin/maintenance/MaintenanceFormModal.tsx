import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { TechnicianSelect } from "@/components/ui/TechnicianSelect";
import { assignmentPayload } from "@/lib/users";
import type { MaintenanceKind } from "@/types/maintenance/maintenance";
import { KIND_LABEL } from "@/utils/maintenance.utils";
import type { MaintenanceFormModalProps } from "@/types/maintenance/props";

export function MaintenanceFormModal({
  creating,
  editing,
  closeModal,
  submit,
  form,
  setForm,
  equipmentOptions,
  equipmentError,
  scheduleOptions,
  technicianListAvailable,
  technicians,
  role,
  setPdf,
  saving,
}: MaintenanceFormModalProps) {
  return (
    <Modal
      open={creating || !!editing}
      onClose={closeModal}
      title={editing ? "Editar mantenimiento" : "Nuevo mantenimiento"}
      size="lg"
    >
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Equipo"
          value={String(form.equipment)}
          onChange={(e) =>
            setForm({
              ...form,
              equipment: Number(e.target.value),
              scheduled_maintenance: null,
            })
          }
          options={equipmentOptions}
          placeholder="Selecciona un equipo"
          required
          className="sm:col-span-2"
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
        <Select
          label="Cumple agendamiento (opcional)"
          value={
            form.scheduled_maintenance != null
              ? String(form.scheduled_maintenance)
              : ""
          }
          onChange={(e) =>
            setForm({
              ...form,
              scheduled_maintenance: e.target.value
                ? Number(e.target.value)
                : null,
            })
          }
          options={scheduleOptions}
          placeholder={
            scheduleOptions.length === 0
              ? "No hay agendamientos pendientes para este equipo"
              : "Sin agendamiento asociado"
          }
          disabled={scheduleOptions.length === 0}
          hint="Si lo asocias, el agendamiento se marcará como cumplido automáticamente."
          className="sm:col-span-2"
        />
        <Select
          label="Tipo"
          value={form.kind}
          onChange={(e) =>
            setForm({ ...form, kind: e.target.value as MaintenanceKind })
          }
          options={Object.entries(KIND_LABEL).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <Input
          label="Fecha"
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          required
        />
        {technicianListAvailable ? (
          <TechnicianSelect
            label="Técnico o ingeniero"
            value={form.assigned_technician ?? form.assigned_engineer ?? null}
            onChange={(_id, user) =>
              setForm({ ...form, ...assignmentPayload(user ?? null) })
            }
            technicians={technicians}
            required
            hint="Búscalo por nombre, usuario o correo. Sólo técnicos / ingenieros activos."
          />
        ) : (
          <Input
            label="ID del técnico (opcional)"
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
            hint={
              role === "tecnico" || role === "ingeniero"
                ? "Si lo dejas vacío, queda asignado a ti."
                : "Tu rol no lista usuarios; deja vacío o escribe el ID del responsable."
            }
          />
        )}
        {editing && (
          <Input
            label="Costo (opcional)"
            type="number"
            step="0.01"
            value={form.cost ?? ""}
            onChange={(e) => setForm({ ...form, cost: e.target.value })}
          />
        )}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-sm font-medium text-app">Descripción</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            required
            className="w-full rounded-lg border border-app bg-surface px-3 py-2.5 text-sm text-app outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-sm font-medium text-app">
            Observaciones (opcional)
          </label>
          <textarea
            value={form.observations ?? ""}
            onChange={(e) =>
              setForm({ ...form, observations: e.target.value })
            }
            rows={3}
            placeholder="Hallazgos, trabajo realizado, recomendaciones..."
            className="w-full rounded-lg border border-app bg-surface px-3 py-2.5 text-sm text-app outline-none placeholder:text-app-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        {!editing && (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-app">
              Adjuntar PDF (opcional)
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
              className="text-sm text-app-muted"
            />
            <p className="text-xs text-app-muted">
              Máximo 10 MB. Solo .pdf.
            </p>
          </div>
        )}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button variant="secondary" onClick={closeModal} type="button">
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
