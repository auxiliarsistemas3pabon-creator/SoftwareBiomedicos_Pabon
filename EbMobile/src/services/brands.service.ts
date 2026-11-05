import { api } from "@/lib/api";
import type { Paginated } from "@/types/api";
import type { Brand, BrandInput } from "@/types/brand";

export interface BrandsListParams {
  ordering?: string;
  is_active?: boolean;
  search?: string;
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
