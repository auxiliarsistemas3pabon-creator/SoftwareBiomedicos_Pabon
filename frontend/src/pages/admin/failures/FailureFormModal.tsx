import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import type { FailureSeverity } from "@/types/failure/failure";
import type { FailureFormModalProps } from "@/types/failure/props";
import { SEV_LABEL } from "@/utils/failure.utils";

export function FailureFormModal({
  creating,
  editing,
  closeModal,
  submit,
  form,
  setForm,
  equipmentOptions,
  equipmentError,
  saving,
}: FailureFormModalProps) {
  return (
    <Modal
      open={creating || !!editing}
      onClose={closeModal}
      title={editing ? "Editar reporte" : "Nuevo reporte de falla"}
      size="lg"
    >
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
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
        <Select
          label="Severidad"
          value={form.severity}
          onChange={(e) =>
            setForm({ ...form, severity: e.target.value as FailureSeverity })
          }
          options={Object.entries(SEV_LABEL).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-sm font-medium text-app">Descripción</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            required
            className="w-full rounded-lg border border-app bg-surface px-3 py-2.5 text-sm text-app outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
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
