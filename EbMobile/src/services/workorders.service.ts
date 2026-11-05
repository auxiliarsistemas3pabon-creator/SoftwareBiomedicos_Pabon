import { api } from "@/lib/api";
import type { Paginated } from "@/types/api";
import type {
  WorkOrder,
  WorkOrderDetail,
  WorkOrderInput,
} from "@/types/workorder";

function unwrap<T>(data: Paginated<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.results;
}

export interface WorkOrderListParams {
  ordering?: string;
  equipment?: number;
  status?: string;
  service_type?: string;
  search?: string;
}

export const workOrdersService = {
  async list(params: WorkOrderListParams = {}) {
    const res = await api.get<Paginated<WorkOrder> | WorkOrder[]>(
      "/equipment/work-orders/",
      { params },
    );
    return unwrap(res.data);
  },
  async details(id: number) {
    const res = await api.get<WorkOrderDetail>(
      `/equipment/work-orders/${id}/details/`,
    );
    return res.data;
  },
  async create(input: WorkOrderInput) {
    const res = await api.post<WorkOrder>("/equipment/work-orders/", input);
    return res.data;
  },
  async update(id: number, input: Partial<WorkOrderInput>) {
    const res = await api.patch<WorkOrder>(
      `/equipment/work-orders/${id}/`,
      input,
    );
    return res.data;
  },
  async listAll(params: WorkOrderListParams = {}) {
    const all: WorkOrder[] = [];
    for (let page = 1; page < 500; page += 1) {
      const res = await api.get<Paginated<WorkOrder> | WorkOrder[]>(
        "/equipment/work-orders/",
        { params: { ...params, page } },
      );
      if (Array.isArray(res.data)) return res.data;
      all.push(...res.data.results);
      if (!res.data.next) break;
    }
    return all;
  },
  async complete(
    id: number,
    body: {
      observations?: string;
      status?: string;
      failure_description?: string;
      failure_severity?: string;
      failure_resolution_notes?: string;
    } = {},
  ) {
    const res = await api.post<WorkOrder>(
      `/equipment/work-orders/${id}/complete/`,
      body,
    );
    return res.data;
  },
};
