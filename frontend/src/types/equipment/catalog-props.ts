import type { Brand, BrandInput, EquipmentModel, ModelInput } from "@/types/equipment/brand";
import type { Dispatch, SetStateAction, FormEvent } from "react";

export interface CatalogBrandsCardProps {
  brandNameFilter: string;
  setBrandNameFilter: Dispatch<SetStateAction<string>>;
  brandStatusFilter: string;
  setBrandStatusFilter: Dispatch<SetStateAction<string>>;
  brandError: string | null;
  brandLoading: boolean;
  brands: Brand[];
  brandColSpan: number;
  canEdit: boolean;
  canDelete: boolean;
  togglingBrandId: number | null;
  changeBrandStatus: (brand: Brand, is_active: boolean) => Promise<void>;
  openCreateBrand: () => void;
  openEditBrand: (b: Brand) => void;
  setBrandToDelete: Dispatch<SetStateAction<Brand | null>>;
  brandCount: number;
  brandPage: number;
  loadBrands: (targetPage?: number) => Promise<void>;
  brandOptions: { value: string; label: string }[];
}

export interface CatalogModelsCardProps {
  modelNameFilter: string;
  setModelNameFilter: Dispatch<SetStateAction<string>>;
  modelBrandFilter: string;
  setModelBrandFilter: Dispatch<SetStateAction<string>>;
  brandOptions: { value: string; label: string }[];
  modelStatusFilter: string;
  setModelStatusFilter: Dispatch<SetStateAction<string>>;
  modelError: string | null;
  modelLoading: boolean;
  models: EquipmentModel[];
  modelColSpan: number;
  canEdit: boolean;
  canDelete: boolean;
  togglingModelId: number | null;
  changeModelStatus: (m: EquipmentModel, is_active: boolean) => Promise<void>;
  openCreateModel: () => void;
  openEditModel: (m: EquipmentModel) => void;
  setModelToDelete: Dispatch<SetStateAction<EquipmentModel | null>>;
  modelCount: number;
  modelPage: number;
  loadModels: (targetPage?: number) => Promise<void>;
  modelOptions: { value: string; label: string; hint?: string }[];
}

export interface BrandFormModalProps {
  creatingBrand: boolean;
  editingBrand: Brand | null;
  closeBrandModal: () => void;
  submitBrand: (e: FormEvent) => void;
  brandForm: BrandInput;
  setBrandForm: Dispatch<SetStateAction<BrandInput>>;
  savingBrand: boolean;
}

export interface ModelFormModalProps {
  creatingModel: boolean;
  editingModel: EquipmentModel | null;
  closeModelModal: () => void;
  submitModel: (e: FormEvent) => void;
  modelForm: ModelInput;
  setModelForm: Dispatch<SetStateAction<ModelInput>>;
  brandOptions: { value: string; label: string }[];
  savingModel: boolean;
}
