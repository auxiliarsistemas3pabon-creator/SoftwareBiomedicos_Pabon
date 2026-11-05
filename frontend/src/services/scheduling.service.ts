import { api } from "@/lib/api";
import type { Paginated } from "@/types/api/api";
import type {
  ScheduleCreateInput,
  ScheduleUpdateInput,
  ScheduledMaintenance,
} from "@/types/scheduling/scheduling";

export interface ScheduleListParams {
  ordering?: string;
  equipment?: number;
  branch?: number;
  area?: string;
  kind?: string;
  is_completed?: boolean;
  scheduled_date_after?: string;
  scheduled_date_before?: string;
  requested_date_after?: string;
  requested_date_before?: string;
  unscheduled?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

function unwrapList<T>(data: Paginated<T> | T[]): T[] {
  if (Array.isArray(data)) return data;
  return data.results;
}

export const schedulingService = {
  async list(params: ScheduleListParams = {}) {
    const res = await api.get<Paginated<ScheduledMaintenance> | ScheduledMaintenance[]>(
      "/scheduling/maintenances/",
      { params },
    );
    return unwrapList(res.data);
  },
  /** Igual que list(), pero conserva count/next/previous para paginar en la UI. */
  async listPaginated(params: ScheduleListParams = {}) {
    const res = await api.get<Paginated<ScheduledMaintenance> | ScheduledMaintenance[]>(
      "/scheduling/maintenances/",
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
    const res = await api.get<ScheduledMaintenance>(
      `/scheduling/maintenances/${id}/`,
    );
    return res.data;
  },
  async create(input: ScheduleCreateInput) {
    const res = await api.post<ScheduledMaintenance>(
      "/scheduling/maintenances/",
      input,
    );
    return res.data;
  },
  async update(id: number, input: ScheduleUpdateInput) {
    const res = await api.patch<ScheduledMaintenance>(
      `/scheduling/maintenances/${id}/`,
      input,
    );
    return res.data;
  },
  async remove(id: number) {
    await api.delete(`/scheduling/maintenances/${id}/`);
  },
  async complete(id: number) {
    const res = await api.post<ScheduledMaintenance>(
      `/scheduling/maintenances/${id}/complete/`,
    );
    return res.data;
  },
  async notify(id: number) {
    const res = await api.post<{ detail: string }>(
      `/scheduling/maintenances/${id}/notify/`,
    );
    return res.data;
  },
};
