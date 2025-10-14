// frontend/src/services/activos.ts
import { httpJSON } from "../lib/http";
import type { Sucursal } from "../features/gestion-activos/constants";
const BASE = "/api/activos"; // httpJSON usará VITE_API_BASE + este path

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
  numeroFactura?: string;
  detalles?: string;
  sucursal?: "" | Sucursal;
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
  sucursal?: "" | Sucursal;
  numeroFactura?: string;
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
  const search = qs.toString() ? `?${qs.toString()}` : "";
  const json = await httpJSON<{ ok: boolean; data: Activo[]; error?: string }>(
    "activos",
    `${BASE}${search}`
  );
  if (!json.ok) throw new Error(json.error || "Error listando activos");
  return json.data;
}

export async function createActivo(payload: Partial<Activo>) {
  const json = await httpJSON<{ ok: boolean; data: Activo; error?: string }>(
    "activos",
    BASE,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
  if (!json.ok) throw new Error(json.error || "Error creando activo");
  return json.data;
}

export async function updateActivo(id: string, changes: Partial<Activo>) {
  const json = await httpJSON<{ ok: boolean; data: Activo; error?: string }>(
    "activos",
    `${BASE}/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(changes),
    }
  );
  if (!json.ok) throw new Error(json.error || "Error actualizando activo");
  return json.data;
}

export async function deleteActivo(id: string) {
  const json = await httpJSON<{ ok: boolean; error?: string }>(
    "activos",
    `${BASE}/${id}`,
    { method: "DELETE" }
  );
  if (!json.ok) throw new Error(json.error || "Error eliminando activo");
}

export async function assignActivo(
  id: string,
  asignadoPara: string,
  asignadoPor: string,
  fechaAsignacion?: string
) {
  const json = await httpJSON<{ ok: boolean; data: Activo; error?: string }>(
    "activos",
    `${BASE}/${id}/asignar`,
    {
      method: "POST",
      body: JSON.stringify({ asignadoPara, asignadoPor, fechaAsignacion }),
    }
  );
  if (!json.ok) throw new Error(json.error || "Error asignando activo");
  return json.data;
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
  const json = await httpJSON<{ ok: boolean; data: Activo; error?: string }>(
    "activos",
    `${BASE}/${id}/licencia/asignar`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
  if (!json.ok) throw new Error(json.error || "Error asignando licencia");
  return json.data;
}

export async function liberarLicencia(id: string) {
  const json = await httpJSON<{ ok: boolean; data: Activo; error?: string }>(
    "activos",
    `${BASE}/${id}/licencia/liberar`,
    { method: "POST" }
  );
  if (!json.ok) throw new Error(json.error || "Error liberando licencia");
  return json.data;
}

export async function updateLicencia(
  id: string,
  changes: Partial<Pick<Licencia, "tipo" | "estado" | "expiraEn" | "proveedor">>
) {
  const json = await httpJSON<{ ok: boolean; data: Activo; error?: string }>(
    "activos",
    `${BASE}/${id}/licencia`,
    {
      method: "PATCH",
      body: JSON.stringify(changes),
    }
  );
  if (!json.ok) throw new Error(json.error || "Error actualizando licencia");
  return json.data;
}

export async function getHistorico(id: string) {
  const json = await httpJSON<{
    ok: boolean;
    data: { asignadoPara?: HistoricoAsignacion[] };
    error?: string;
  }>("activos", `${BASE}/${id}/historico`);
  if (!json.ok) throw new Error(json.error || "Error obteniendo histórico");
  return json.data;
}
