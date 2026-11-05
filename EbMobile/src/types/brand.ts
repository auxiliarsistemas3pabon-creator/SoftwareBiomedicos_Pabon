export interface Brand {
  id: number;
  name: string;
  is_active: boolean;
  models_count?: number;
  created_at?: string;
  updated_at?: string;
}

export type BrandInput = Pick<Brand, "name" | "is_active">;

export interface EquipmentModel {
  id: number;
  brand: number;
  brand_name?: string;
  name: string;
  is_active: boolean;
  equipment_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ModelInput {
  name: string;
  brand: number;
  is_active: boolean;
}
