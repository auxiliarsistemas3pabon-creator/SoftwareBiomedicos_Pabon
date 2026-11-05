import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { BrandFormModalProps } from "@/types/equipment/catalog-props";

export function BrandFormModal({
  creatingBrand,
  editingBrand,
  closeBrandModal,
  submitBrand,
  brandForm,
  setBrandForm,
  savingBrand,
}: BrandFormModalProps) {
  return (
    <Modal
      open={creatingBrand || !!editingBrand}
      onClose={closeBrandModal}
      title={editingBrand ? "Editar marca" : "Nueva marca"}
      size="sm"
      nested
    >
      <form onSubmit={submitBrand} className="flex flex-col gap-4">
        <Input
          label="Nombre de la marca"
          value={brandForm.name}
          onChange={(e) =>
            setBrandForm({ ...brandForm, name: e.target.value })
          }
          required
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={closeBrandModal}>
            Cancelar
          </Button>
          <Button type="submit" loading={savingBrand}>
            {editingBrand ? "Guardar" : "Crear"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
