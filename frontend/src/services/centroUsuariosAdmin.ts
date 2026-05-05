import { getStoredAuthToken } from "../auth/authStorage";
import type {
  PayloadUsuarioCentro,
  UsuarioCentroAdmin,
} from "../features/admin-usuarios/types";

const CENTRO_APLICACIONES_BASE = (
  import.meta.env.VITE_CENTRO_APLICACIONES_BASE || "http://192.168.200.80:3005"
).replace(/\/+$/, "");

export type CatalogosCentroAdmin = {
  sucursales: string[];
  areas: string[];
  centrosCosto: string[];
  roles: string[];
  permisosAppStock: string[];
};

function normalizarUsuarioCentro(data: any): UsuarioCentroAdmin {
  return {
    _id: String(data?._id || ""),
    usuario: String(data?.usuario || "").trim(),
    pnombre: String(data?.pnombre || "").trim(),
    snombre: String(data?.snombre || "").trim(),
    papellido: String(data?.papellido || "").trim(),
    sapellido: String(data?.sapellido || "").trim(),
    email: String(data?.email || "").trim(),
    sucursal: String(data?.sucursal || "").trim(),
    area: String(data?.area || "").trim(),
    centrocosto: String(data?.centrocosto || data?.centroCosto || "").trim(),
    rol: Array.isArray(data?.rol) ? data.rol.map(String) : [],
    activo: data?.activo !== false,
    permisos: Array.isArray(data?.permisos)
      ? data.permisos.map(String).filter(Boolean)
      : [],
    permisosAppStock: Array.isArray(data?.permisosAppStock)
      ? data.permisosAppStock.map(String).filter(Boolean)
      : [],
    createdAt:
      typeof data?.createdAt === "string" ? data.createdAt : undefined,
    updatedAt:
      typeof data?.updatedAt === "string" ? data.updatedAt : undefined,
  };
}

function extraerListadoUsuarios(json: any) {
  // El backend del Centro responde con formas distintas según el endpoint.
  const candidatos = Array.isArray(json)
    ? json
    : Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json?.usuarios)
        ? json.usuarios
        : [];

  return candidatos.map(normalizarUsuarioCentro);
}

function extraerUsuario(json: any) {
  const source = json?.data || json?.usuario || json;
  return normalizarUsuarioCentro(source);
}

async function parseErrorResponse(res: Response) {
  const json = await res.json().catch(() => null);
  const mensaje =
    json?.message ||
    json?.mensaje ||
    json?.error ||
    json?.details ||
    `Error HTTP ${res.status}`;
  throw new Error(String(mensaje));
}

async function centroRequest(
  path: string,
  init?: RequestInit,
  token?: string
) {
  const authToken = (token || getStoredAuthToken() || "").trim();
  const res = await fetch(`${CENTRO_APLICACIONES_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(init?.headers || {}),
    },
  });

  if (res.status === 204) return null;
  if (!res.ok) {
    await parseErrorResponse(res);
  }

  return res.json().catch(() => null);
}

export async function listarUsuariosCentro(token?: string) {
  const json = await centroRequest("/centrodeaplicaciones", undefined, token);
  return extraerListadoUsuarios(json);
}

export async function obtenerCatalogosCentro(
  token?: string
): Promise<CatalogosCentroAdmin> {
  const json = await centroRequest(
    "/centrodeaplicaciones/catalogos",
    undefined,
    token
  );

  const data = json?.data || json || {};

  return {
    sucursales: Array.isArray(data?.sucursales)
      ? data.sucursales.map(String).filter(Boolean)
      : [],
    areas: Array.isArray(data?.areas)
      ? data.areas.map(String).filter(Boolean)
      : [],
    centrosCosto: Array.isArray(data?.centrosCosto)
      ? data.centrosCosto.map(String).filter(Boolean)
      : Array.isArray(data?.centrocostos)
        ? data.centrocostos.map(String).filter(Boolean)
        : [],
    roles: Array.isArray(data?.roles)
      ? data.roles.map(String).filter(Boolean)
      : [],
    permisosAppStock: Array.isArray(data?.permisosAppStock)
      ? data.permisosAppStock.map(String).filter(Boolean)
      : [],
  };
}

export async function crearUsuarioCentro(
  payload: PayloadUsuarioCentro,
  token?: string
) {
  const json = await centroRequest(
    "/centrodeaplicaciones",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token
  );
  return extraerUsuario(json);
}

export async function actualizarUsuarioCentro(
  id: string,
  payload: Partial<PayloadUsuarioCentro>,
  token?: string
) {
  const json = await centroRequest(
    `/centrodeaplicaciones/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token
  );
  return extraerUsuario(json);
}

export async function cambiarEstadoUsuarioCentro(
  id: string,
  activo: boolean,
  token?: string
) {
  const json = await centroRequest(
    `/centrodeaplicaciones/${id}/estado`,
    {
      method: "PATCH",
      body: JSON.stringify({ activo }),
    },
    token
  );
  return extraerUsuario(json);
}

export async function restablecerPasswordUsuarioCentro(
  id: string,
  password: string,
  token?: string
) {
  const json = await centroRequest(
    `/centrodeaplicaciones/${id}/password-admin`,
    {
      method: "PATCH",
      body: JSON.stringify({ password }),
    },
    token
  );
  return extraerUsuario(json);
}

export async function eliminarUsuarioCentro(id: string, token?: string) {
  await centroRequest(
    `/centrodeaplicaciones/${id}`,
    {
      method: "DELETE",
    },
    token
  );
}
