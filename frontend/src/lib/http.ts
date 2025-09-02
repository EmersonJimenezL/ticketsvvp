type Bases = "auth" | "tickets";

const BASES: Record<Bases, string> = {
  auth: import.meta.env.VITE_API_AUTH_BASE!,
  tickets: import.meta.env.VITE_API_TICKETS_BASE!,
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
