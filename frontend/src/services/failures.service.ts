import { api } from "@/lib/api";
import type { Paginated } from "@/types/api/api";
import type { FailureInput, FailureReport } from "@/types/failure/failure";

export interface FailuresListParams {
  ordering?: string;
  equipment?: number;
  branch?: number;
  area?: string;
  severity?: string;
  resolved?: boolean;
  reported_at_after?: string;
  reported_at_before?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

function unwrapList<T>(data: Paginated<T> | T[]): T[] {
  if (Array.isArray(data)) return data;
  return data.results;
}

export const failuresService = {
  async list(params: FailuresListParams = {}) {
    const res = await api.get<Paginated<FailureReport> | FailureReport[]>(
      "/failures/",
      { params },
    );
    return unwrapList(res.data);
  },
  /** Igual que list(), pero conserva count/next/previous para paginar en la UI. */
  async listPaginated(params: FailuresListParams = {}) {
    const res = await api.get<Paginated<FailureReport> | FailureReport[]>(
      "/failures/",
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
  async retrieve(id: number) {
    const res = await api.get<FailureReport>(`/failures/${id}/`);
    return res.data;
  },
  async create(input: FailureInput) {
    const res = await api.post<FailureReport>("/failures/", input);
    return res.data;
  },
  async update(id: number, input: Partial<FailureInput> & { resolved?: boolean; resolution_notes?: string }) {
    const res = await api.patch<FailureReport>(`/failures/${id}/`, input);
    return res.data;
  },
  async remove(id: number) {
    await api.delete(`/failures/${id}/`);
  },
  async resolve(id: number, resolution_notes?: string) {
    const res = await api.post<FailureReport>(
      `/failures/${id}/resolve/`,
      resolution_notes ? { resolution_notes } : {},
    );
    return res.data;
  },
};
