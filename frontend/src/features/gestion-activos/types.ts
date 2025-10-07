import type { Sucursal } from "./constants";

export type TabKey = "activos" | "licencias" | "estadisticas";

export type CentroCosto = "Adm. y Finanzas" | "Comercial" | "Operaciones" | "PostVenta" | "Repuestos" | "Logistica";

export type Activo = {
  _id?: string;
  categoria?: string;
  marca?: string;
  modelo?: string;
  fechaCompra?: string;
  numeroSerie?: string;
  numeroFactura?: string;
  detalles?: string;
  sucursal?: "" | Sucursal;
  centroCosto?: "" | CentroCosto;
  asignadoPara?: string;
  fechaAsignacion?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Licencia = {
  _id?: string;
  proveedor?: "SAP" | "Office";
  cuenta?: string;
  tipoLicencia?: string;
  fechaCompra?: string;
  sucursal?: "" | Sucursal;
  centroCosto?: "" | CentroCosto;
  asignadoPara?: string;
  fechaAsignacion?: string;
  activoId?: string;
  notas?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type LicenciaStats = {
  total: number;
  disponibles: number;
  ocupadas: number;
  porTipo: Record<string, number>;
  porProveedor: Record<string, number>;
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

export type ActivoFilters = {
  categoria: string;
  sucursal: "" | Sucursal;
  desdeCompra: string;
  hastaCompra: string;
  desdeAsignacion: string;
  hastaAsignacion: string;
  soloSinAsignacion: boolean;
};

export type LicenciaFilters = {
  cuenta: string;
  proveedor: string;
  tipoLicencia: string;
  asignadoPara: string;
  sucursal: "" | Sucursal;
  desdeCompra: string;
  hastaCompra: string;
  desdeAsignacion: string;
  hastaAsignacion: string;
};

export type AssignContext = {
  tipo: "activo" | "licencia";
  id: string;
  titulo: string;
  asignadoPara: string;
  fechaAsignacion: string;
};

export type DeleteContext = {
  tipo: "activo" | "licencia";
  id: string;
  titulo: string;
};

export type HistMovimiento = {
  usuario?: string;
  accion?: string;
  fecha?: string;
  observacion?: string;
  por?: string;
  desde?: string;
  hasta?: string;
};
