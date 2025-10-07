export const API_BASE = "/api";

export const PAGE_SIZE = 25;

export const OPCIONES_CATEGORIA = [
  "Notebook",
  "PC",
  "Monitor",
  "Tablet",
  "Impresora",
  "Periferico",
  "Otro",
] as const;

export const OPCIONES_TIPO_LIC_MAP = {
  SAP: [
    "Profesional",
    "CRM limitada",
    "Logistica limitada",
    "Acceso indirecto",
    "Financiera limitada",
  ],
  Office: [
    "Microsoft 365 E3",
    "Microsoft 365 Empresa Basico",
    "Microsoft 365 Empresa Estandar",
  ],
} as const;

export const OPCIONES_PROVEEDOR = ["SAP", "Office"] as const;

export const OPCIONES_SUCURSAL = [
  "Casa Matriz",
  "Sucursal Puerto Montt",
  "Sucursal Antofagasta",
  "Sucursal Talca",
  "Sucursal Centro Puerto",
  "Sucursal Cambio y Soluciones (Peru)",
  "Sucursal Valparaiso",
  "Sucursal Copiapo",
] as const;

export const OPCIONES_CENTRO_COSTO = [
  "Adm. y Finanzas",
  "Comercial",
  "Operaciones",
  "PostVenta",
  "Repuestos",
  "Logistica",
] as const;

export type Sucursal = (typeof OPCIONES_SUCURSAL)[number];
