import { api } from "@/lib/api";
import type { Paginated } from "@/types/api/api";
import type { Branch, BranchInput } from "@/types/equipment/branch";

export interface BranchesListParams {
  ordering?: string;
  city?: string;
  is_active?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

function unwrapList<T>(data: Paginated<T> | T[]): T[] {
  if (Array.isArray(data)) return data;
  return data.results;
}

export const branchesService = {
  async list(params: BranchesListParams = {}) {
    const res = await api.get<Paginated<Branch> | Branch[]>("/branches/", { params });
    return unwrapList(res.data);
  },
  /** Igual que list(), pero conserva count/next/previous para paginar en la UI. */
  async listPaginated(params: BranchesListParams = {}) {
    const res = await api.get<Paginated<Branch> | Branch[]>("/branches/", { params });
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
  /** Trae todas las sedes recorriendo la paginación, para el buscador. */
  async listAll(params: Omit<BranchesListParams, "page" | "page_size"> = {}) {
    const all: Branch[] = [];
    for (let page = 1; page < 500; page += 1) {
      const res = await api.get<Paginated<Branch> | Branch[]>("/branches/", {
        params: { ...params, page },
      });
      if (Array.isArray(res.data)) return res.data;
      all.push(...res.data.results);
      if (!res.data.next) break;
    }
    return all;
  },
  async retrieve(id: number) {
    const res = await api.get<Branch>(`/branches/${id}/`);
    return res.data;
  },
  async create(input: BranchInput) {
    const res = await api.post<Branch>("/branches/", input);
    return res.data;
  },
  async update(id: number, input: Partial<BranchInput>) {
    const res = await api.patch<Branch>(`/branches/${id}/`, input);
    return res.data;
  },
  async remove(id: number) {
    await api.delete(`/branches/${id}/`);
  },
};
