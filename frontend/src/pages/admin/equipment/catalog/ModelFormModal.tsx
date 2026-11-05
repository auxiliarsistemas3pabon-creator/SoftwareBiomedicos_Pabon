import { Button } from "@/components/ui/Button";
import { Combobox } from "@/components/ui/Combobox";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { ModelFormModalProps } from "@/types/equipment/catalog-props";

export function ModelFormModal({
  creatingModel,
  editingModel,
  closeModelModal,
  submitModel,
  modelForm,
  setModelForm,
  brandOptions,
  savingModel,
}: ModelFormModalProps) {
  const selectedBrand =
    brandOptions.find((o) => o.value === String(modelForm.brand)) ?? null;

  return (
    <Modal
      open={creatingModel || !!editingModel}
      onClose={closeModelModal}
      title={editingModel ? "Editar modelo" : "Nuevo modelo"}
      size="sm"
      nested
    >
      <form onSubmit={submitModel} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-app">Marca</label>
          <Combobox
            options={brandOptions}
            value={selectedBrand}
            onSelect={(opt) =>
              setModelForm({ ...modelForm, brand: opt ? Number(opt.value) : 0 })
            }
            placeholder="Busca una marca..."
            ariaLabel="Marca"
          />
          <input
            className="pointer-events-none absolute h-0 w-0 opacity-0"
            tabIndex={-1}
            aria-hidden
            value={modelForm.brand ? String(modelForm.brand) : ""}
            onChange={() => undefined}
            required
          />
        </div>
        <Input
          label="Nombre del modelo"
          value={modelForm.name}
          onChange={(e) =>
            setModelForm({ ...modelForm, name: e.target.value })
          }
          required
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={closeModelModal}>
            Cancelar
          </Button>
          <Button type="submit" loading={savingModel}>
            {editingModel ? "Guardar" : "Crear"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
