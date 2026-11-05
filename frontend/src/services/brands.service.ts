import { api } from "@/lib/api";
import type { Paginated } from "@/types/api/api";
import type { Brand, BrandInput } from "@/types/equipment/brand";

export interface BrandsListParams {
  ordering?: string;
  is_active?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

function unwrapList<T>(data: Paginated<T> | T[]): T[] {
  if (Array.isArray(data)) return data;
  return data.results;
}

export const brandsService = {
  async list(params: BrandsListParams = {}) {
    const res = await api.get<Paginated<Brand> | Brand[]>("/catalog/brands/", { params });
    return unwrapList(res.data);
  },
  /** Igual que list(), pero conserva count/next/previous para paginar en la UI. */
  async listPaginated(params: BrandsListParams = {}) {
    const res = await api.get<Paginated<Brand> | Brand[]>("/catalog/brands/", { params });
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
   * Trae TODAS las marcas recorriendo la paginación. Úsalo para poblar un
   * <Select> (ej. "Marca" al crear un modelo): con list()/listPaginated()
   * el desplegable solo ofrecería la página visible, no todo el catálogo.
   */
  async listAll(params: Omit<BrandsListParams, "page" | "page_size"> = {}) {
    const all: Brand[] = [];
    for (let page = 1; page < 500; page += 1) {
      const res = await api.get<Paginated<Brand> | Brand[]>("/catalog/brands/", {
        params: { ...params, page },
      });
      if (Array.isArray(res.data)) return res.data;
      all.push(...res.data.results);
      if (!res.data.next) break;
    }
    return all;
  },
  async retrieve(id: number) {
    const res = await api.get<Brand>(`/catalog/brands/${id}/`);
    return res.data;
  },
  async create(input: BrandInput) {
    const res = await api.post<Brand>("/catalog/brands/", input);
    return res.data;
  },
  async update(id: number, input: Partial<BrandInput>) {
    const res = await api.patch<Brand>(`/catalog/brands/${id}/`, input);
    return res.data;
  },
  async remove(id: number) {
    await api.delete(`/catalog/brands/${id}/`);
  },
};
