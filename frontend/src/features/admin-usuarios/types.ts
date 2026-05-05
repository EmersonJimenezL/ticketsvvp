import {
  OPCIONES_AREA_CENTRO,
  OPCIONES_CENTRO_COSTO_CENTRO,
  OPCIONES_PERMISOS_APP_STOCK,
  OPCIONES_ROL_CENTRO,
  OPCIONES_SUCURSAL_CENTRO,
} from "./constants";

export type SucursalCentro = (typeof OPCIONES_SUCURSAL_CENTRO)[number];
export type AreaCentro = (typeof OPCIONES_AREA_CENTRO)[number];
export type CentroCostoCentro = (typeof OPCIONES_CENTRO_COSTO_CENTRO)[number];
export type RolCentro = (typeof OPCIONES_ROL_CENTRO)[number];
export type PermisoAppStock = (typeof OPCIONES_PERMISOS_APP_STOCK)[number];

export type UsuarioCentroAdmin = {
  _id: string;
  usuario: string;
  pnombre: string;
  snombre?: string;
  papellido: string;
  sapellido?: string;
  email: string;
  sucursal: string;
  area: string;
  centrocosto: string;
  rol: string[];
  activo: boolean;
  permisos: string[];
  permisosAppStock?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type FormularioUsuarioCentro = {
  usuario: string;
  pnombre: string;
  snombre: string;
  papellido: string;
  sapellido: string;
  email: string;
  sucursal: string;
  area: string;
  centrocosto: string;
  rol: string[];
  permisos: string[];
  permisosAppStock: string[];
  activo: boolean;
  password: string;
  passwordConfirmacion: string;
};

export type PayloadUsuarioCentro = {
  usuario: string;
  pnombre: string;
  snombre?: string;
  papellido: string;
  sapellido?: string;
  email: string;
  sucursal: string;
  area: string;
  centrocosto: string;
  rol: string[];
  permisos: string[];
  permisosAppStock?: string[];
  activo: boolean;
  password?: string;
};
