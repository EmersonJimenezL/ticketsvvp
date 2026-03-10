import type { CentroUsuario, Licencia } from "../types";
import { getUsuarioLabel } from "./usuarios";

type CuentaValue = Licencia["cuenta"];
const USER_SUCURSAL_KEYS = ["sucursal", "sede", "branch"] as const;
const USER_CENTRO_COSTO_KEYS = [
  "centroCosto",
  "centro_costo",
  "centrocosto",
  "ccosto",
] as const;
const USER_AREA_KEYS = ["gerencia", "area"] as const;

export function normalizeProveedorLicencia(
  proveedor?: Licencia["proveedor"]
): "SAP" | "OFFICE" | "" {
  if (!proveedor) return "";
  const normalized = String(proveedor).trim().toUpperCase();
  if (normalized === "SAP") return "SAP";
  if (normalized === "OFFICE") return "OFFICE";
  return "";
}

export function isOfficeProveedor(proveedor?: Licencia["proveedor"]): boolean {
  return normalizeProveedorLicencia(proveedor) === "OFFICE";
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function pickFirstString(
  source: Record<string, unknown>,
  keys: readonly string[]
): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }
  return "";
}

function getCuentaRecord(cuenta: CuentaValue): Record<string, unknown> {
  if (!cuenta || typeof cuenta !== "object" || Array.isArray(cuenta)) {
    return {};
  }
  return cuenta as Record<string, unknown>;
}

export function resolveUsuarioByAsignado(
  asignadoPara: string | undefined,
  usuarios: CentroUsuario[]
): CentroUsuario | null {
  const normalizedAsignado = normalizeText(asignadoPara).toLowerCase();
  if (!normalizedAsignado) return null;

  return (
    usuarios.find((user) => {
      const label = getUsuarioLabel(user).trim().toLowerCase();
      const usuario = normalizeText(user.usuario).toLowerCase();
      const email = normalizeText(user.email).toLowerCase();
      return (
        label === normalizedAsignado ||
        usuario === normalizedAsignado ||
        email === normalizedAsignado
      );
    }) || null
  );
}

export type UsuarioLicenciaAutofill = {
  usuario: CentroUsuario | null;
  sucursal: string;
  centroCosto: string;
  area: string;
  email: string;
  usuarioLogin: string;
  displayName: string;
};

export function getUsuarioLicenciaAutofill(input: {
  asignadoPara?: string;
  usuarios: CentroUsuario[];
}): UsuarioLicenciaAutofill {
  const usuario = resolveUsuarioByAsignado(input.asignadoPara, input.usuarios);
  if (!usuario) {
    return {
      usuario: null,
      sucursal: "",
      centroCosto: "",
      area: "",
      email: "",
      usuarioLogin: "",
      displayName: "",
    };
  }

  const userRecord = toRecord(usuario);
  const sucursal = pickFirstString(userRecord, USER_SUCURSAL_KEYS);
  const centroCosto = pickFirstString(userRecord, USER_CENTRO_COSTO_KEYS);
  const area = pickFirstString(userRecord, USER_AREA_KEYS);
  const email = normalizeText(usuario.email);
  const usuarioLogin = normalizeText(usuario.usuario);
  const displayName = getUsuarioLabel(usuario);

  return {
    usuario,
    sucursal,
    centroCosto,
    area,
    email,
    usuarioLogin,
    displayName,
  };
}

export function getCuentaDisplay(cuenta: CuentaValue): string {
  if (!cuenta) return "";
  if (typeof cuenta === "string") return cuenta.trim();
  if (typeof cuenta !== "object" || Array.isArray(cuenta)) return "";

  const objectCuenta = getCuentaRecord(cuenta);
  const cuentaPrincipal = pickFirstString(objectCuenta, [
    "cuenta",
    "email",
    "correo",
    "usuario",
    "username",
    "value",
    "label",
  ]);
  if (cuentaPrincipal) return cuentaPrincipal;

  const fullNameParts = [
    objectCuenta.pnombre,
    objectCuenta.snombre,
    objectCuenta.papellido,
    objectCuenta.sapellido,
  ].filter((part): part is string => typeof part === "string" && part.trim() !== "");
  if (fullNameParts.length) {
    return fullNameParts.join(" ").trim();
  }

  return pickFirstString(objectCuenta, [
    "displayName",
    "nombreCompleto",
    "nombre",
    "usuarioNombre",
  ]);
}

export function getCuentaAssignedDisplay(cuenta: CuentaValue): string {
  if (!cuenta) return "";
  if (typeof cuenta === "string") return cuenta.trim();
  if (typeof cuenta !== "object" || Array.isArray(cuenta)) return "";

  const objectCuenta = getCuentaRecord(cuenta);
  const fullNameParts = [
    objectCuenta.pnombre,
    objectCuenta.snombre,
    objectCuenta.papellido,
    objectCuenta.sapellido,
  ].filter((part): part is string => typeof part === "string" && part.trim() !== "");
  if (fullNameParts.length) {
    return fullNameParts.join(" ").trim();
  }

  return pickFirstString(objectCuenta, [
    "displayName",
    "nombreCompleto",
    "nombre",
    "usuarioNombre",
    "usuario",
    "username",
    "email",
    "correo",
    "cuenta",
    "label",
    "value",
  ]);
}

export function getCuentaSearchValue(cuenta: CuentaValue): string {
  return getCuentaDisplay(cuenta).toLowerCase();
}

export function getCuentaAssignedSearchValue(cuenta: CuentaValue): string {
  return getCuentaAssignedDisplay(cuenta).toLowerCase();
}

function getCuentaField(cuenta: CuentaValue, keys: readonly string[]): string {
  return pickFirstString(getCuentaRecord(cuenta), keys);
}

export function getCuentaSucursal(cuenta: CuentaValue): string {
  return getCuentaField(cuenta, USER_SUCURSAL_KEYS);
}

export function getCuentaCentroCosto(cuenta: CuentaValue): string {
  return getCuentaField(cuenta, USER_CENTRO_COSTO_KEYS);
}

export function getCuentaArea(cuenta: CuentaValue): string {
  return getCuentaField(cuenta, USER_AREA_KEYS);
}

export function hasCuentaValue(cuenta: CuentaValue): boolean {
  if (!cuenta) return false;
  if (typeof cuenta === "string") return cuenta.trim() !== "";
  if (typeof cuenta !== "object" || Array.isArray(cuenta)) return false;
  return Object.values(cuenta).some((value) => {
    if (typeof value === "string") return value.trim() !== "";
    return value != null;
  });
}

export function isCuentaDisponible(cuenta: CuentaValue): boolean {
  return getCuentaSearchValue(cuenta) === "disponible";
}

export function buildCuentaPayload(input: {
  cuenta: CuentaValue;
  proveedor?: Licencia["proveedor"];
  asignadoPara?: string;
  usuarios: CentroUsuario[];
}): Record<string, unknown> {
  const { cuenta, proveedor, asignadoPara, usuarios } = input;
  const baseCuenta = toRecord(cuenta);
  const autofill = getUsuarioLicenciaAutofill({ asignadoPara, usuarios });
  const payload: Record<string, unknown> = autofill.usuario
    ? { ...toRecord(autofill.usuario) }
    : { ...baseCuenta };
  const cuentaManual = getCuentaDisplay(cuenta);

  let cuentaPrincipal = cuentaManual;
  if (autofill.usuario) {
    if (isOfficeProveedor(proveedor) && autofill.email) {
      cuentaPrincipal = autofill.email;
    } else if (!cuentaPrincipal) {
      cuentaPrincipal =
        autofill.usuarioLogin || autofill.displayName || autofill.email;
    }
  }

  if (cuentaPrincipal) {
    payload.cuenta = cuentaPrincipal;
    payload.label = cuentaPrincipal;
    payload.value = cuentaPrincipal;
  }

  if (autofill.usuario) {
    payload.usuario = autofill.usuario.usuario || "";
    if (autofill.email) payload.email = autofill.email;
    if (autofill.usuario.pnombre) payload.pnombre = autofill.usuario.pnombre;
    if (autofill.usuario.snombre) payload.snombre = autofill.usuario.snombre;
    if (autofill.usuario.papellido) payload.papellido = autofill.usuario.papellido;
    if (autofill.usuario.sapellido) payload.sapellido = autofill.usuario.sapellido;
    if (autofill.displayName) payload.displayName = autofill.displayName;
    if (autofill.sucursal) payload.sucursal = autofill.sucursal;
    if (autofill.centroCosto) payload.centroCosto = autofill.centroCosto;
    if (autofill.area) payload.area = autofill.area;
  }

  return payload;
}
