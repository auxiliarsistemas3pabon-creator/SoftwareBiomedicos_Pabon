import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
  forwardRef,
} from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { brandsService } from "@/services/brands.service";
import { modelsService } from "@/services/models.service";
import { getApiErrorMessage } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { can } from "@/lib/permissions";
import type { Brand, BrandInput, EquipmentModel, ModelInput } from "@/types/equipment/brand";
import { PAGE_SIZE } from "@/utils/catalog.utils";
import { CatalogBrandsCard } from "@/pages/admin/equipment/catalog/CatalogBrandsCard";
import { CatalogModelsCard } from "@/pages/admin/equipment/catalog/CatalogModelsCard";
import { BrandFormModal } from "@/pages/admin/equipment/catalog/BrandFormModal";
import { ModelFormModal } from "@/pages/admin/equipment/catalog/ModelFormModal";

interface Props {
  // Permite que el componente padre se entere de cambios y refresque sus
  // selects (por ejemplo el formulario de equipos).
  onChanged?: (created?: { brand?: Brand; model?: EquipmentModel }) => void;
}

export interface MarcasModelosPanelHandle {
  openCreateBrand: () => void;
  openCreateModel: (brandId?: number) => void;
}

export const MarcasModelosPanel = forwardRef<MarcasModelosPanelHandle, Props>(
  function MarcasModelosPanel({ onChanged }, ref) {
  const { usuario } = useAuth();
  const role = usuario?.role;
  const canEdit = can(role, "equipment", "edit");
  const canDelete = can(role, "equipment", "delete");

  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [allModels, setAllModels] = useState<EquipmentModel[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandCount, setBrandCount] = useState(0);
  const [brandPage, setBrandPage] = useState(1);
  const [brandLoading, setBrandLoading] = useState(true);
  const [brandError, setBrandError] = useState<string | null>(null);
  const [brandNameFilter, setBrandNameFilter] = useState("");
  const [brandStatusFilter, setBrandStatusFilter] = useState("");

  const [models, setModels] = useState<EquipmentModel[]>([]);
  const [modelCount, setModelCount] = useState(0);
  const [modelPage, setModelPage] = useState(1);
  const [modelLoading, setModelLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelNameFilter, setModelNameFilter] = useState("");
  const [modelStatusFilter, setModelStatusFilter] = useState("");
  const [modelBrandFilter, setModelBrandFilter] = useState("");

  const [creatingBrand, setCreatingBrand] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandForm, setBrandForm] = useState<BrandInput>({
    name: "",
    is_active: true,
  });
  const [savingBrand, setSavingBrand] = useState(false);
  const [creatingModel, setCreatingModel] = useState(false);
  const [editingModel, setEditingModel] = useState<EquipmentModel | null>(null);
  const [modelForm, setModelForm] = useState<ModelInput>({
    name: "",
    brand: 0,
    is_active: true,
  });
  const [savingModel, setSavingModel] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);
  const [deletingBrand, setDeletingBrand] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<EquipmentModel | null>(null);
  const [deletingModel, setDeletingModel] = useState(false);
  const [togglingBrandId, setTogglingBrandId] = useState<number | null>(null);
  const [togglingModelId, setTogglingModelId] = useState<number | null>(null);

  const loadAllBrands = async () => {
    try {
      setAllBrands(await brandsService.listAll({ ordering: "name" }));
    } catch {
      // El listado paginado sigue funcionando aunque falle el select.
    }
  };

  const loadAllModels = async () => {
    try {
      setAllModels(await modelsService.listAll({ ordering: "name" }));
    } catch {
      // El listado paginado sigue funcionando aunque falle el buscador.
    }
  };

  const loadBrands = async (
    targetPage = brandPage,
    opts?: { name?: string; status?: string },
  ) => {
    const name = opts && "name" in opts ? opts.name : brandNameFilter;
    const status = opts && "status" in opts ? opts.status : brandStatusFilter;
    setBrandLoading(true);
    setBrandError(null);
    try {
      const data = await brandsService.listPaginated({
        ordering: "name",
        search: name || undefined,
        is_active:
          status === "true" ? true : status === "false" ? false : undefined,
        page: targetPage,
        page_size: PAGE_SIZE,
      });
      setBrands(data.results);
      setBrandCount(data.count);
      setBrandPage(targetPage);
    } catch (err) {
      setBrandError(getApiErrorMessage(err, "No se pudieron cargar las marcas"));
    } finally {
      setBrandLoading(false);
    }
  };

  const loadModels = async (
    targetPage = modelPage,
    opts?: { brand?: string; name?: string; status?: string },
  ) => {
    const brand = opts && "brand" in opts ? opts.brand : modelBrandFilter;
    const name = opts && "name" in opts ? opts.name : modelNameFilter;
    const status = opts && "status" in opts ? opts.status : modelStatusFilter;
    setModelLoading(true);
    setModelError(null);
    try {
      const data = await modelsService.listPaginated({
        ordering: "name",
        brand: brand ? Number(brand) : undefined,
        name: name || undefined,
        is_active:
          status === "true" ? true : status === "false" ? false : undefined,
        page: targetPage,
        page_size: PAGE_SIZE,
      });
      setModels(data.results);
      setModelCount(data.count);
      setModelPage(targetPage);
    } catch (err) {
      setModelError(getApiErrorMessage(err, "No se pudieron cargar los modelos"));
    } finally {
      setModelLoading(false);
    }
  };

  useEffect(() => {
    void loadAllBrands();
    void loadAllModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadBrands(1);
    }, 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandNameFilter, brandStatusFilter]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadModels(1);
    }, 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelNameFilter, modelBrandFilter, modelStatusFilter]);

  const closeBrandModal = () => {
    setCreatingBrand(false);
    setEditingBrand(null);
  };

  const closeModelModal = () => {
    setCreatingModel(false);
    setEditingModel(null);
  };

  const openCreateBrand = () => {
    setBrandForm({ name: "", is_active: true });
    setCreatingBrand(true);
  };

  const openCreateModel = (brandId?: number) => {
    const preferred = brandId
      ? allBrands.find((b) => b.id === brandId)
      : allBrands[0];
    setModelForm({
      name: "",
      brand: preferred?.id ?? 0,
      is_active: true,
    });
    setCreatingModel(true);
  };

  const openEditBrand = (b: Brand) => {
    setEditingBrand(b);
    setBrandForm({ name: b.name, is_active: b.is_active });
  };

  const openEditModel = (m: EquipmentModel) => {
    setEditingModel(m);
    setModelForm({
      name: m.name,
      brand: m.brand,
      is_active: m.is_active,
    });
  };

  const submitBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBrand(true);
    try {
      if (editingBrand) {
        await brandsService.update(editingBrand.id, { name: brandForm.name });
        closeBrandModal();
        await loadAllBrands();
        await loadBrands();
        await loadModels();
        onChanged?.();
      } else {
        const created = await brandsService.create({
          name: brandForm.name,
          is_active: true,
        });
        closeBrandModal();
        await loadAllBrands();
        await loadBrands(1);
        onChanged?.({ brand: created });
      }
    } catch (err) {
      alert(getApiErrorMessage(err, "Error al guardar la marca"));
    } finally {
      setSavingBrand(false);
    }
  };

  const submitModel = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingModel(true);
    try {
      if (editingModel) {
        await modelsService.update(editingModel.id, {
          name: modelForm.name,
          brand: modelForm.brand,
        });
        closeModelModal();
        await loadModels();
        await loadAllModels();
        onChanged?.();
      } else {
        const created = await modelsService.create({
          name: modelForm.name,
          brand: modelForm.brand,
          is_active: true,
        });
        closeModelModal();
        setModelBrandFilter(String(created.brand));
        setModelNameFilter(created.name);
        setModelStatusFilter("");
        await loadModels(1, {
          brand: String(created.brand),
          name: created.name,
          status: "",
        });
        await loadAllModels();
        onChanged?.({ model: created });
      }
    } catch (err) {
      alert(getApiErrorMessage(err, "Error al guardar el modelo"));
    } finally {
      setSavingModel(false);
    }
  };

  const confirmDeleteBrand = async () => {
    if (!brandToDelete) return;
    setDeletingBrand(true);
    try {
      await brandsService.remove(brandToDelete.id);
      setBrandToDelete(null);
      await loadAllBrands();
      await loadBrands();
      await loadModels();
      onChanged?.();
    } catch (err) {
      alert(getApiErrorMessage(err, "No se pudo eliminar la marca"));
    } finally {
      setDeletingBrand(false);
    }
  };

  const confirmDeleteModel = async () => {
    if (!modelToDelete) return;
    setDeletingModel(true);
    try {
      await modelsService.remove(modelToDelete.id);
      setModelToDelete(null);
      await loadModels();
      await loadAllModels();
      onChanged?.();
    } catch (err) {
      alert(getApiErrorMessage(err, "No se pudo eliminar el modelo"));
    } finally {
      setDeletingModel(false);
    }
  };

  const changeBrandStatus = async (brand: Brand, is_active: boolean) => {
    if (is_active === brand.is_active) return;
    const previous = brand.is_active;
    setBrands((prev) =>
      prev.map((b) => (b.id === brand.id ? { ...b, is_active } : b)),
    );
    setAllBrands((prev) =>
      prev.map((b) => (b.id === brand.id ? { ...b, is_active } : b)),
    );
    setTogglingBrandId(brand.id);
    try {
      const updated = await brandsService.update(brand.id, { is_active });
      setBrands((prev) =>
        prev.map((b) => (b.id === brand.id ? { ...b, ...updated } : b)),
      );
      setAllBrands((prev) =>
        prev.map((b) => (b.id === brand.id ? { ...b, ...updated } : b)),
      );
      onChanged?.();
    } catch (err) {
      setBrands((prev) =>
        prev.map((b) => (b.id === brand.id ? { ...b, is_active: previous } : b)),
      );
      setAllBrands((prev) =>
        prev.map((b) => (b.id === brand.id ? { ...b, is_active: previous } : b)),
      );
      alert(getApiErrorMessage(err, "No se pudo actualizar el estado de la marca"));
    } finally {
      setTogglingBrandId(null);
    }
  };

  const changeModelStatus = async (m: EquipmentModel, is_active: boolean) => {
    if (is_active === m.is_active) return;
    const previous = m.is_active;
    setModels((prev) =>
      prev.map((it) => (it.id === m.id ? { ...it, is_active } : it)),
    );
    setTogglingModelId(m.id);
    try {
      const updated = await modelsService.update(m.id, { is_active });
      setModels((prev) =>
        prev.map((it) => (it.id === m.id ? { ...it, ...updated } : it)),
      );
      onChanged?.();
    } catch (err) {
      setModels((prev) =>
        prev.map((it) => (it.id === m.id ? { ...it, is_active: previous } : it)),
      );
      alert(getApiErrorMessage(err, "No se pudo actualizar el estado del modelo"));
    } finally {
      setTogglingModelId(null);
    }
  };

  const brandOptions = useMemo(
    () => allBrands.map((b) => ({ value: String(b.id), label: b.name })),
    [allBrands],
  );

  const modelOptions = useMemo(
    () =>
      allModels.map((m) => ({
        value: String(m.id),
        label: m.name,
        hint: m.brand_name,
      })),
    [allModels],
  );

  const brandColSpan = canEdit || canDelete ? 3 : 2;
  const modelColSpan = canEdit || canDelete ? 4 : 3;

  useImperativeHandle(ref, () => ({
    openCreateBrand,
    openCreateModel,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-app">Catálogo</h1>
        <p className="text-sm text-app-muted">Marcas y modelos</p>
      </div>
      <CatalogBrandsCard
        brandNameFilter={brandNameFilter}
        setBrandNameFilter={setBrandNameFilter}
        brandStatusFilter={brandStatusFilter}
        setBrandStatusFilter={setBrandStatusFilter}
        brandError={brandError}
        brandLoading={brandLoading}
        brands={brands}
        brandColSpan={brandColSpan}
        canEdit={canEdit}
        canDelete={canDelete}
        togglingBrandId={togglingBrandId}
        changeBrandStatus={changeBrandStatus}
        openCreateBrand={openCreateBrand}
        openEditBrand={openEditBrand}
        setBrandToDelete={setBrandToDelete}
        brandCount={brandCount}
        brandPage={brandPage}
        loadBrands={loadBrands}
        brandOptions={brandOptions}
      />

      <CatalogModelsCard
        modelNameFilter={modelNameFilter}
        setModelNameFilter={setModelNameFilter}
        modelBrandFilter={modelBrandFilter}
        setModelBrandFilter={setModelBrandFilter}
        brandOptions={brandOptions}
        modelStatusFilter={modelStatusFilter}
        setModelStatusFilter={setModelStatusFilter}
        modelError={modelError}
        modelLoading={modelLoading}
        models={models}
        modelColSpan={modelColSpan}
        canEdit={canEdit}
        canDelete={canDelete}
        togglingModelId={togglingModelId}
        changeModelStatus={changeModelStatus}
        openCreateModel={() => openCreateModel()}
        openEditModel={openEditModel}
        setModelToDelete={setModelToDelete}
        modelCount={modelCount}
        modelPage={modelPage}
        loadModels={loadModels}
        modelOptions={modelOptions}
      />

      <BrandFormModal
        creatingBrand={creatingBrand}
        editingBrand={editingBrand}
        closeBrandModal={closeBrandModal}
        submitBrand={submitBrand}
        brandForm={brandForm}
        setBrandForm={setBrandForm}
        savingBrand={savingBrand}
      />

      <ModelFormModal
        creatingModel={creatingModel}
        editingModel={editingModel}
        closeModelModal={closeModelModal}
        submitModel={submitModel}
        modelForm={modelForm}
        setModelForm={setModelForm}
        brandOptions={brandOptions}
        savingModel={savingModel}
      />

      <ConfirmDialog
        open={!!brandToDelete}
        title="Eliminar marca"
        description={`¿Eliminar la marca "${brandToDelete?.name}"? Si tiene modelos asociados el backend lo rechazará.`}
        confirmText="Eliminar"
        danger
        loading={deletingBrand}
        onConfirm={confirmDeleteBrand}
        onClose={() => setBrandToDelete(null)}
      />
      <ConfirmDialog
        open={!!modelToDelete}
        title="Eliminar modelo"
        description={`¿Eliminar el modelo "${modelToDelete?.name}"? Si tiene equipos asociados el backend lo rechazará.`}
        confirmText="Eliminar"
        danger
        loading={deletingModel}
        onConfirm={confirmDeleteModel}
        onClose={() => setModelToDelete(null)}
      />
    </div>
  );
});
