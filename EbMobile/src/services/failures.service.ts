import { api } from "@/lib/api";
import type { Paginated } from "@/types/api";
import type { FailureInput, FailureReport } from "@/types/failure";

export interface FailuresListParams {
  ordering?: string;
  equipment?: number;
  branch?: number;
  severity?: string;
  resolved?: boolean;
  reported_at_after?: string;
  reported_at_before?: string;
  search?: string;
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
  /** Trae TODAS las fallas recorriendo la paginación — ver equipmentService.listAll. */
  async listAll(params: FailuresListParams = {}) {
    const all: FailureReport[] = [];
    for (let page = 1; page < 500; page += 1) {
      const res = await api.get<Paginated<FailureReport> | FailureReport[]>(
        "/failures/",
        { params: { ...params, page } },
      );
      if (Array.isArray(res.data)) return res.data;
      all.push(...res.data.results);
      if (!res.data.next) break;
    }
    return all;
  },
  async retrieve(id: number) {
    const res = await api.get<FailureReport>(`/failures/${id}/`);
    return res.data;
  },
  async create(input: FailureInput) {
    const res = await api.post<FailureReport>("/failures/", input);
    return res.data;
  },
  async update(
    id: number,
    input: Partial<FailureInput> & { resolved?: boolean; resolution_notes?: string },
  ) {
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
