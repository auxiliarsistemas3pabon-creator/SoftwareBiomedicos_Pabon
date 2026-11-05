import { api } from "@/lib/api";
import type { Paginated } from "@/types/api";
import type { MaintenanceInput, MaintenanceRecord } from "@/types/maintenance";

export interface MaintenanceListParams {
  ordering?: string;
  equipment?: number;
  branch?: number;
  kind?: string;
  date_after?: string;
  date_before?: string;
  search?: string;
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
  async retrieve(id: number) {
    const res = await api.get<MaintenanceRecord>(`/maintenance/records/${id}/`);
    return res.data;
  },
  async create(input: MaintenanceInput) {
    const res = await api.post<MaintenanceRecord>("/maintenance/records/", input);
    return res.data;
  },
  // En móvil, en lugar de un File del DOM se recibe un objeto con uri/name/type
  // (formato de expo-document-picker / expo-image-picker).
  async createWithFile(
    input: MaintenanceInput,
    pdf: { uri: string; name: string; type?: string },
  ) {
    const fd = new FormData();
    Object.entries(input).forEach(([k, v]) => {
      if (v !== undefined && v !== null) fd.append(k, String(v));
    });
    // RN admite este shape para FormData (cast a any porque la lib estándar
    // sólo conoce Blob).
    fd.append("pdf_file", {
      uri: pdf.uri,
      name: pdf.name,
      type: pdf.type ?? "application/pdf",
    } as unknown as Blob);
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
