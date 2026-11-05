import { api } from "@/lib/api";
import type { Paginated } from "@/types/api/api";
import type { Equipment, EquipmentInput } from "@/types/equipment/equipment";

export interface EquipmentListParams {
  ordering?: string;
  branch?: number;
  status?: string;
  brand?: number;
  equipment_model?: number;
  risk_class?: string;
  search?: string;
  page?: number;
  page_size?: number;
  name_startswith?:string;
}

function unwrapList<T>(data: Paginated<T> | T[]): T[] {
  if (Array.isArray(data)) return data;
  return data.results;
}

export const equipmentService = {
  async list(params: EquipmentListParams = {}) {
    const res = await api.get<Paginated<Equipment> | Equipment[]>(
      "/equipment/",
      { params },
    );
    return unwrapList(res.data);
  },
  async listPaginated(params: EquipmentListParams = {}) {
    const res = await api.get<Paginated<Equipment> | Equipment[]>(
      "/equipment/",
      { params },
    );
    if (Array.isArray(res.data)) {
      // Backend sin paginación: simulamos un único bloque.
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
    const res = await api.get<Equipment>(`/equipment/${id}/`);
    return res.data;
  },
  /** Trae todos los equipos recorriendo la paginación del backend. */
  async listAll(params: Omit<EquipmentListParams, "page" | "page_size"> = {}) {
    const all: Equipment[] = [];
    for (let page = 1; page < 500; page += 1) {
      const res = await api.get<Paginated<Equipment> | Equipment[]>(
        "/equipment/",
        { params: { ...params, page } },
      );
      if (Array.isArray(res.data)) return res.data;
      all.push(...res.data.results);
      if (!res.data.next) break;
    }
    return all;
  },
  async byAssetTag(tag: string) {
    const res = await api.get<Equipment>(
      `/equipment/by-asset-tag/${encodeURIComponent(tag)}/`,
    );
    return res.data;
  },
  async create(input: EquipmentInput) {
    const res = await api.post<Equipment>("/equipment/", input);
    return res.data;
  },
  async update(id: number, input: Partial<EquipmentInput>) {
    const res = await api.patch<Equipment>(`/equipment/${id}/`, input);
    return res.data;
  },
  async remove(id: number) {
    await api.delete(`/equipment/${id}/`);
  },
  async regenerateQr(id: number) {
    const res = await api.post<Equipment>(`/equipment/${id}/regenerate-qr/`);
    return res.data;
  },
  /** Sube o reemplaza la foto del equipo (`equipment_image` del modelo). */
  async updateImage(id: number, file: File) {
    const fd = new FormData();
    fd.append("equipment_image", file);
    const res = await api.patch<Equipment>(`/equipment/${id}/`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
  async regenerateQrAll(params: { missing?: boolean } = {}) {
    const res = await api.post<{ regenerated: number }>(
      "/equipment/regenerate-qr-all/",
      null,
      { params: params.missing ? { missing: 1 } : {} },
    );
    return res.data;
  },
  async names(params:{name_startswith?:string; branch?:number} = {}) {
    const res = await api.get<string[]>("/equipment/names/",{params});
    return res.data;
  }
};
