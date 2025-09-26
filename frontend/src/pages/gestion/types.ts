// Shared types and constants for Gestión de Activos/Licencias

export type Activo = {
  _id?: string;
  categoria?: string;
  marca?: string;
  modelo?: string;
  fechaCompra?: string; // ISO
  numeroSerie?: string;
  numeroFactura?: string;
  detalles?: string;
  asignadoPara?: string;
  fechaAsignacion?: string; // ISO
  createdAt?: string;
  updatedAt?: string;
};

export type Licencia = {
  _id?: string;
  proveedor?: "SAP" | "Office";
  cuenta?: string;
  tipoLicencia?: string;
  fechaCompra?: string; // ISO
  asignadoPara?: string;
  fechaAsignacion?: string; // ISO
  activoId?: string;
  notas?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Especificacion = {
  _id?: string;
  modelo: string;
  categoria?: string;
  marca?: string;
  procesador?: string;
  frecuenciaGhz?: string;
  almacenamiento?: string;
  ram?: string;
  so?: string;
  graficos?: string;
  resolucion?: string;
};

// Catálogo estático de categorías
export const OPCIONES_CATEGORIA = [
  "Notebook",
  "PC",
  "Monitor",
  "Tablet",
  "Impresora",
  "Periférico",
  "Otro",
] as const;

// Tipos de licencias por proveedor
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
