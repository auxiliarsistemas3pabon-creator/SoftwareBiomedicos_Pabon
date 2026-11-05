export interface Branch {
  id: number;
  name: string;
  address: string;
  city: string;
  phone?: string | null;
  email?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type BranchInput = Omit<Branch, "id" | "created_at" | "updated_at">;
