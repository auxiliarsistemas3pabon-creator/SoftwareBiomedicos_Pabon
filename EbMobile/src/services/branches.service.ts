import { api } from "@/lib/api";
import type { Paginated } from "@/types/api";
import type { Branch, BranchInput } from "@/types/branch";

export interface BranchesListParams {
  ordering?: string;
  city?: string;
  is_active?: boolean;
  search?: string;
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
