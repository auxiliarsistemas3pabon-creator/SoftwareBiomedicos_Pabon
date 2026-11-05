type Cls = string | number | bigint | boolean | null | undefined;

export function cn(...inputs: (Cls | Cls[])[]): string {
  const out: string[] = [];
  for (const i of inputs) {
    if (!i || i === true) continue;
    if (Array.isArray(i)) {
      const sub = cn(...i);
      if (sub) out.push(sub);
      continue;
    }
    if (
      typeof i === "string" ||
      typeof i === "number" ||
      typeof i === "bigint"
    ) {
      out.push(String(i));
    }
  }
  return out.join(" ");
}
