// Ajusta BASE si usas proxy: ideal dejar rutas relativas.
const BASE = "/api/activos";

export type CategoriaActivo =
  | "computadoras"
  | "impresoras"
  | "celulares"
  | "cuentas"
  | "licencias";

export interface Activo {
  _id: string;
  categoria: CategoriaActivo;
  marca: string;
  modelo: string;
  numeroSerie: string;
  asignadoPara?: string;
  asignadoPor?: string;
  fechaCompra: string; // ISO
  fechaAsignacion?: string; // ISO
  createdAt?: string;
  updatedAt?: string;
}

export interface HistoricoAsignacion {
  nombre: string;
  fecha: string;
}

export async function listActivos(
  params: Record<string, string | boolean | undefined> = {}
) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") qs.append(k, String(v));
  });
  const res = await fetch(`${BASE}?${qs.toString()}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Error listando activos");
  return json.data as Activo[];
}

export async function createActivo(payload: Partial<Activo>) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Error creando activo");
  return json.data as Activo;
}

export async function updateActivo(id: string, changes: Partial<Activo>) {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Error actualizando activo");
  return json.data as Activo;
}

export async function deleteActivo(id: string) {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Error eliminando activo");
}

export async function assignActivo(
  id: string,
  asignadoPara: string,
  asignadoPor: string,
  fechaAsignacion?: string
) {
  const res = await fetch(`${BASE}/${id}/asignar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ asignadoPara, asignadoPor, fechaAsignacion }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Error asignando activo");
  return json.data as Activo;
}

export async function getHistorico(id: string) {
  const res = await fetch(`${BASE}/${id}/historico`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Error obteniendo histórico");
  return json.data as { asignadoPara?: HistoricoAsignacion[] };
}
