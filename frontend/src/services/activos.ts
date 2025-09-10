// frontend/src/services/activos.ts
const BASE = "/api/activos";

export type CategoriaActivo =
  | "computadoras"
  | "impresoras"
  | "celulares"
  | "cuentas"
  | "licencias";
export type TipoLicencia =
  | "profesional"
  | "crmLimitado"
  | "finanzasLimitadas"
  | "logisticaLimitada"
  | "accesoIndirecto";
export type EstadoLicencia =
  | "disponible"
  | "asignada"
  | "bloqueada"
  | "vencida";
export type Proveedor = "sap" | "office";

export interface Licencia {
  tipo: TipoLicencia;
  estado: EstadoLicencia;
  proveedor: Proveedor; // requerido
  usuarioNombre?: string;
  usuarioCodigo?: string;
  asignadaEn?: string | null;
  expiraEn?: string | null;
}

export interface Activo {
  _id: string;
  categoria: CategoriaActivo;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  asignadoPara?: string;
  asignadoPor?: string;
  fechaCompra: string; // ISO
  fechaAsignacion?: string | null; // ISO
  licencia?: Licencia;
  createdAt?: string;
  updatedAt?: string;
}

export interface HistoricoAsignacion {
  nombre: string;
  fecha: string;
  codigoUsuario?: string;
  tipoLicencia?: TipoLicencia;
}

export type ListActivosQuery = {
  categoria?: CategoriaActivo | "";
  marca?: string;
  usuario?: string;
  sinAsignar?: "true";
  fechaCompraDesde?: string;
  fechaCompraHasta?: string;
  fechaAsignacionDesde?: string;
  fechaAsignacionHasta?: string;
  tipoLicencia?: TipoLicencia;
  estadoLicencia?: EstadoLicencia;
  usuarioCodigo?: string;
  proveedor?: Proveedor;
};

export async function listActivos(params: ListActivosQuery = {}) {
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

// Licencias
export async function assignLicencia(
  id: string,
  body: {
    usuarioNombre: string;
    usuarioCodigo: string;
    asignadoPor: string;
    fechaAsignacion?: string;
  }
) {
  const res = await fetch(`${BASE}/${id}/licencia/asignar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Error asignando licencia");
  return json.data as Activo;
}

export async function liberarLicencia(id: string) {
  const res = await fetch(`${BASE}/${id}/licencia/liberar`, { method: "POST" });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Error liberando licencia");
  return json.data as Activo;
}

export async function updateLicencia(
  id: string,
  changes: Partial<Pick<Licencia, "tipo" | "estado" | "expiraEn" | "proveedor">>
) {
  const res = await fetch(`${BASE}/${id}/licencia`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Error actualizando licencia");
  return json.data as Activo;
}

export async function getHistorico(id: string) {
  const res = await fetch(`${BASE}/${id}/historico`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Error obteniendo histórico");
  return json.data as { asignadoPara?: HistoricoAsignacion[] };
}
