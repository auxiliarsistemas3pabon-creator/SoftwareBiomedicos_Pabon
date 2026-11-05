import { api } from "@/lib/api";
import type { Paginated } from "@/types/api";
import type { Usuario } from "@/types/auth";
import type { CreateUserInput, SetPasswordInput, UpdateUserInput } from "@/types/user";

export interface UsersListParams {
  ordering?: string;
  role?: string;
  is_active?: boolean;
  search?: string;
}

function unwrapList<T>(data: Paginated<T> | T[]): T[] {
  if (Array.isArray(data)) return data;
  return data.results;
}

export const usersService = {
  async list(params: UsersListParams = {}) {
    const res = await api.get<Paginated<Usuario> | Usuario[]>("/users/", { params });
    return unwrapList(res.data);
  },
  async retrieve(id: number) {
    const res = await api.get<Usuario>(`/users/${id}/`);
    return res.data;
  },
  async create(input: CreateUserInput) {
    const res = await api.post<Usuario>("/users/", input);
    return res.data;
  },
  async update(id: number, input: UpdateUserInput) {
    const res = await api.patch<Usuario>(`/users/${id}/`, input);
    return res.data;
  },
  async remove(id: number) {
    await api.delete(`/users/${id}/`);
  },
  async setPassword(id: number, input: SetPasswordInput) {
    const res = await api.post<{ detail: string }>(
      `/users/${id}/set_password/`,
      input,
    );
    return res.data;
  },
};
