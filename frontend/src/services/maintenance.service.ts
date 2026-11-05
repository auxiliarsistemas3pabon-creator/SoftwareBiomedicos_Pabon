import { api } from "@/lib/api";
import type { Paginated } from "@/types/api/api";
import type { MaintenanceInput, MaintenanceRecord } from "@/types/maintenance/maintenance";

export interface MaintenanceListParams {
  ordering?: string;
  equipment?: number;
  equipment_name?: string;
  branch?: number;
  kind?: string;
  date_after?: string;
  date_before?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

function unwrapList<T>(data: Paginated<T> | T[]): T[] {
  if (Array.isArray(data)) return data;
  return data.results;
}

export const maintenanceService = {
  async list(params: MaintenanceListParams = {}) {
    const res = await api.get<Paginated<MaintenanceRecord> | MaintenanceRecord[]>(
      "/maintenance/records/",
      { params },
    );
    return unwrapList(res.data);
  },
  /** Igual que list(), pero conserva count/next/previous para paginar en la UI. */
  async listPaginated(params: MaintenanceListParams = {}) {
    const res = await api.get<Paginated<MaintenanceRecord> | MaintenanceRecord[]>(
      "/maintenance/records/",
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
  /** Trae todos los registros recorriendo la paginación, para el buscador. */
  async listAll(params: Omit<MaintenanceListParams, "page" | "page_size"> = {}) {
    const all: MaintenanceRecord[] = [];
    for (let page = 1; page < 500; page += 1) {
      const res = await api.get<Paginated<MaintenanceRecord> | MaintenanceRecord[]>(
        "/maintenance/records/",
        { params: { ...params, page } },
      );
      if (Array.isArray(res.data)) return res.data;
      all.push(...res.data.results);
      if (!res.data.next) break;
    }
    return all;
  },
  async retrieve(id: number) {
    const res = await api.get<MaintenanceRecord>(`/maintenance/records/${id}/`);
    return res.data;
  },
  async create(input: MaintenanceInput) {
    const res = await api.post<MaintenanceRecord>("/maintenance/records/", input);
    return res.data;
  },
  async createWithFile(input: MaintenanceInput, pdf: File) {
    const fd = new FormData();
    Object.entries(input).forEach(([k, v]) => {
      if (v !== undefined && v !== null) fd.append(k, String(v));
    });
    fd.append("pdf_file", pdf);
    const res = await api.post<MaintenanceRecord>("/maintenance/records/", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
  async update(id: number, input: Partial<MaintenanceInput>) {
    const res = await api.patch<MaintenanceRecord>(
      `/maintenance/records/${id}/`,
      input,
    );
    return res.data;
  },
  async remove(id: number) {
    await api.delete(`/maintenance/records/${id}/`);
  },
};
