

export interface FieldDef {
  name: string;
  label: string;
  type?: "text" | "number" | "select";
  required?: boolean;
  options?: { value: string; label: string }[];
}
