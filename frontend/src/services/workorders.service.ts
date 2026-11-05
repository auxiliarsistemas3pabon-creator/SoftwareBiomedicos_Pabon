import { api } from "@/lib/api";
import type { Paginated } from "@/types/api/api";
import type {
  WorkOrder,
  WorkOrderCost,
  WorkOrderDetail,
  WorkOrderEvidence,
  WorkOrderInput,
  WorkOrderMeasurement,
  WorkOrderSignature,
  WorkOrderSparePart,
  WorkOrderStatus,
} from "@/types/equipment/workorder";

function unwrap<T>(data: Paginated<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.results;
}

export interface WorkOrderListParams {
  ordering?: string;
  equipment?: number;
  equipment_name?: string;
  status?: string;
  service_type?: string;
  technician?: number;
  search?: string;
  page?: number;
  page_size?: number;
}

export const workOrdersService = {
  async list(params: WorkOrderListParams = {}) {
    const res = await api.get<Paginated<WorkOrder> | WorkOrder[]>(
      "/equipment/work-orders/",
      { params },
    );
    return unwrap(res.data);
  },
  /** Igual que list(), pero conserva count/next/previous para paginar en la UI. */
  async listPaginated(params: WorkOrderListParams = {}) {
    const res = await api.get<Paginated<WorkOrder> | WorkOrder[]>(
      "/equipment/work-orders/",
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
  /** Trae todas las órdenes recorriendo la paginación, para el buscador. */
  async listAll(params: Omit<WorkOrderListParams, "page" | "page_size"> = {}) {
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
  async remove(id: number) {
    await api.delete(`/equipment/work-orders/${id}/`);
  },
  async complete(
    id: number,
    body: {
      observations?: string;
      status?: WorkOrderStatus;
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

  // --- elementos de una orden ---
  sparePart: crud<WorkOrderSparePart>("/equipment/work-order-spare-parts/"),
  measurement: crud<WorkOrderMeasurement>("/equipment/work-order-measurements/"),
  evidence: crud<WorkOrderEvidence>("/equipment/work-order-evidences/"),
  signature: crud<WorkOrderSignature>("/equipment/work-order-signatures/"),
  cost: crud<WorkOrderCost>("/equipment/work-order-costs/"),
};

function crud<T extends { id: number }>(path: string) {
  return {
    async create(input: Record<string, unknown>) {
      const res = await api.post<T>(path, input);
      return res.data;
    },
    async update(id: number, input: Record<string, unknown>) {
      const res = await api.patch<T>(`${path}${id}/`, input);
      return res.data;
    },
    async remove(id: number) {
      await api.delete(`${path}${id}/`);
    },
  };
}
