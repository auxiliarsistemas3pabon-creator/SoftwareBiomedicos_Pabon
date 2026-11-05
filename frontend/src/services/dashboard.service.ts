import { api } from "@/lib/api";
import type { DashboardSummary } from "@/types/dashboard/dashboard";

export const dashboardService = {
  async summary() {
    const res = await api.get<DashboardSummary>("/dashboard/summary/");
    return res.data;
  },
};
