import { api } from "@/lib/api";
import type { Paginated } from "@/types/api/api";
import type { EquipmentModel, ModelInput } from "@/types/equipment/brand";

export interface ModelsListParams {
  ordering?: string;
  brand?: number;
  is_active?: boolean;
  search?: string;
  name?: string;
  brand_name?: string;
  page?: number;
  page_size?: number;
}

function unwrapList<T>(data: Paginated<T> | T[]): T[] {
  if (Array.isArray(data)) return data;
  return data.results;
}

export const modelsService = {
  async list(params: ModelsListParams = {}) {
    const res = await api.get<Paginated<EquipmentModel> | EquipmentModel[]>(
      "/catalog/equipment-models/",
      { params },
    );
    return unwrapList(res.data);
  },
  /** Igual que list(), pero conserva count/next/previous para paginar en la UI. */
  async listPaginated(params: ModelsListParams = {}) {
    const res = await api.get<Paginated<EquipmentModel> | EquipmentModel[]>(
      "/catalog/equipment-models/",
      { params },
    );
    if (Array.isArray(res.data)) {
      return {
        count: res.data.length,
        next: null as string | null,
        previous: null as string | null,
        results: res.data,
      };
    }
    return res.data;
  },
  /**
   * Trae TODOS los modelos recorriendo la paginación. Úsalo para poblar un
   * <Select> (ej. "Modelo" al crear un equipo): con list()/listPaginated()
   * el desplegable solo ofrecería la página visible, no todo el catálogo.
   */
  async listAll(params: Omit<ModelsListParams, "page" | "page_size"> = {}) {
    const all: EquipmentModel[] = [];
    for (let page = 1; page < 500; page += 1) {
      const res = await api.get<Paginated<EquipmentModel> | EquipmentModel[]>(
        "/catalog/equipment-models/",
        { params: { ...params, page } },
      );
      if (Array.isArray(res.data)) return res.data;
      all.push(...res.data.results);
      if (!res.data.next) break;
    }
    return all;
  },
  async retrieve(id: number) {
    const res = await api.get<EquipmentModel>(`/catalog/equipment-models/${id}/`);
    return res.data;
  },
  async create(input: ModelInput) {
    const res = await api.post<EquipmentModel>("/catalog/equipment-models/", input);
    return res.data;
  },
  async update(id: number, input: Partial<ModelInput>) {
    const res = await api.patch<EquipmentModel>(`/catalog/equipment-models/${id}/`, input);
    return res.data;
  },
  async remove(id: number) {
    await api.delete(`/catalog/equipment-models/${id}/`);
  },
};
