type Bases = "auth" | "tickets";

const API_BASE = import.meta.env.VITE_API_BASE!;

const BASES: Record<Bases, string> = {
  auth: API_BASE,
  tickets: API_BASE,
};

export async function httpJSON<T>(
  base: Bases,
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASES[base]}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok)
    throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
  return res.json() as Promise<T>;
}
