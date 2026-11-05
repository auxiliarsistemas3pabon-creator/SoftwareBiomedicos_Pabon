import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import type { WorkOrderServiceType, WorkOrderStatus } from "@/types/equipment/workorder";
import type { WorkOrderFormModalProps } from "@/types/equipment/workorder-props";
import { STATUS_LABEL, TYPE_LABEL } from "@/utils/workorder.utils";

export function WorkOrderFormModal({
  open,
  onClose,
  editing,
  form,
  setForm,
  onSubmit,
  saving,
  equipmentOptions,
  equipmentError,
  technicianOptions,
}: WorkOrderFormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Editar orden ${editing.number}` : "Nueva orden de trabajo"}
      size="lg"
    >
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Equipo"
          value={String(form.equipment)}
          onChange={(e) =>
            setForm({ ...form, equipment: Number(e.target.value) })
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
        <Input
          label="Número de orden"
          value={form.number}
          onChange={(e) => setForm({ ...form, number: e.target.value })}
          required
        />
        <Select
          label="Tipo"
          value={form.service_type}
          onChange={(e) =>
            setForm({
              ...form,
              service_type: e.target.value as WorkOrderServiceType,
            })
          }
          options={Object.entries(TYPE_LABEL).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <Input
          label="Inicio"
          type="datetime-local"
          value={form.start_date}
          onChange={(e) => setForm({ ...form, start_date: e.target.value })}
          required
        />
        <Input
          label="Fin (opcional)"
          type="datetime-local"
          value={form.end_date ?? ""}
          onChange={(e) => setForm({ ...form, end_date: e.target.value })}
        />
        <Select
          label="Técnico responsable"
          value={form.technician ? String(form.technician) : ""}
          onChange={(e) =>
            setForm({
              ...form,
              technician: e.target.value ? Number(e.target.value) : null,
            })
          }
          options={technicianOptions}
        />
        <Select
          label="Estado"
          value={form.status}
          onChange={(e) =>
            setForm({ ...form, status: e.target.value as WorkOrderStatus })
          }
          options={Object.entries(STATUS_LABEL).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-sm font-medium text-app">Descripción</label>
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            rows={3}
            required
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
