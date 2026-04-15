import type { CentroUsuario } from "../features/gestion-activos/types";
import type { Ticket } from "../services/tickets";

export type EstadoAprobacionTicket =
  | "no_requiere"
  | "pendiente"
  | "aprobado"
  | "rechazado";

export type ConfiguracionAprobacion = {
  clave: string;
  etiqueta: string;
  rolSolicitante: string;
  rolAprobador: string;
};

type UsuarioConRoles = {
  rol?: string | string[];
  usuario?: string;
  nombreUsuario?: string;
};

export const CONFIGURACIONES_APROBACION: ConfiguracionAprobacion[] = [
  {
    clave: "contabilidad",
    etiqueta: "Contabilidad",
    rolSolicitante: "contabilidadtkt",
    rolAprobador: "contabilidadtktjf",
  },
  {
    clave: "tesoreria",
    etiqueta: "Tesoreria",
    rolSolicitante: "tesoreriatkt",
    rolAprobador: "tesoreriatktjf",
  },
  {
    clave: "recursos_humanos",
    etiqueta: "Recursos Humanos",
    rolSolicitante: "recursoshumanostkt",
    rolAprobador: "recursoshumanostktjf",
  },
  {
    clave: "cobranza",
    etiqueta: "Cobranza",
    rolSolicitante: "cobranzatkt",
    rolAprobador: "cobranzatktjf",
  },
  {
    clave: "informatica",
    etiqueta: "Informatica",
    rolSolicitante: "informaticatkt",
    rolAprobador: "informaticatktjf",
  },
  {
    clave: "soporte_comercial",
    etiqueta: "Soporte Comercial",
    rolSolicitante: "soportecomercialtkt",
    rolAprobador: "soportecomercialtktjf",
  },
  {
    clave: "asistencia_tecnica",
    etiqueta: "Asistencia Tecnica",
    rolSolicitante: "asistenciatecnicatkt",
    rolAprobador: "asistenciatecnicatktjf",
  },
  {
    clave: "bodega",
    etiqueta: "Bodega",
    rolSolicitante: "bodegatkt",
    rolAprobador: "bodegatktjf",
  },
  {
    clave: "gcamiones",
    etiqueta: "GCamiones",
    rolSolicitante: "gcamionestkt",
    rolAprobador: "gcamionestktjf",
  },
];

export function normalizarRol(valor: string) {
  return valor.trim().toLowerCase();
}

export function obtenerRolesNormalizados(usuario?: UsuarioConRoles | null) {
  const roles = Array.isArray(usuario?.rol)
    ? usuario.rol
    : usuario?.rol
      ? [usuario.rol]
      : [];

  return roles.map(normalizarRol).filter(Boolean);
}

export function obtenerOpcionesAprobacionUsuario(usuario?: UsuarioConRoles | null) {
  const roles = new Set(obtenerRolesNormalizados(usuario));
  return CONFIGURACIONES_APROBACION.filter((item) =>
    roles.has(item.rolSolicitante)
  );
}

export function obtenerOpcionesRevisionUsuario(usuario?: UsuarioConRoles | null) {
  const roles = new Set(obtenerRolesNormalizados(usuario));
  return CONFIGURACIONES_APROBACION.filter((item) =>
    roles.has(item.rolAprobador)
  );
}

export function obtenerRolesSolicitantesEquipoUsuario(
  usuario?: UsuarioConRoles | null
) {
  return obtenerOpcionesRevisionUsuario(usuario).map(
    (item) => item.rolSolicitante
  );
}

export function obtenerAreasEquipoCentroUsuario(
  usuario: Pick<CentroUsuario, "rol"> | null | undefined,
  opcionesRevision: ConfiguracionAprobacion[]
) {
  const roles = new Set(obtenerRolesNormalizados(usuario));
  return opcionesRevision
    .filter((item) => roles.has(item.rolSolicitante))
    .map((item) => item.clave);
}

export function puedeSolicitarAprobacion(usuario?: UsuarioConRoles | null) {
  return obtenerOpcionesAprobacionUsuario(usuario).length > 0;
}

export function puedeRevisarAprobaciones(usuario?: UsuarioConRoles | null) {
  return obtenerOpcionesRevisionUsuario(usuario).length > 0;
}

export function obtenerConfiguracionAprobacionPorClave(clave?: string | null) {
  if (!clave) return null;
  return (
    CONFIGURACIONES_APROBACION.find((item) => item.clave === clave.trim()) || null
  );
}

export function obtenerEtiquetaEstadoAprobacion(
  estado?: EstadoAprobacionTicket | null
) {
  switch (estado) {
    case "pendiente":
      return "Pendiente de aprobacion";
    case "aprobado":
      return "Aprobado por jefatura";
    case "rechazado":
      return "Rechazado por jefatura";
    case "no_requiere":
      return "";
    default:
      return "";
  }
}

export function obtenerClasesEstadoAprobacion(
  estado?: EstadoAprobacionTicket | null
) {
  switch (estado) {
    case "pendiente":
      return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700";
    case "aprobado":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "rechazado":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "no_requiere":
      return "border-neutral-200 bg-neutral-100 text-neutral-700";
    default:
      return "";
  }
}

export function ticketRequiereAprobacion(ticket?: Partial<Ticket> | null) {
  return Boolean(ticket?.aprobacionRequerida);
}

export function ticketEstaListoParaTi(ticket?: Partial<Ticket> | null) {
  if (!ticketRequiereAprobacion(ticket)) return true;
  return ticket?.estadoAprobacion === "aprobado";
}

export function ticketPendienteAprobacion(ticket?: Partial<Ticket> | null) {
  return ticket?.estadoAprobacion === "pendiente";
}

export function ticketRechazadoPorAprobacion(ticket?: Partial<Ticket> | null) {
  return ticket?.estadoAprobacion === "rechazado";
}

export function filtrarTicketsListosParaTi<T extends Partial<Ticket>>(tickets: T[]) {
  return tickets.filter((ticket) => ticketEstaListoParaTi(ticket));
}

export function ticketCoincideConAprobador(
  ticket: Partial<Ticket>,
  rolesAprobadores: string[]
) {
  const rolAprobador = normalizarRol(ticket.rolAprobador || "");
  if (!rolAprobador) return false;
  return rolesAprobadores.map(normalizarRol).includes(rolAprobador);
}

export function obtenerCorreosPorRol(
  usuarios: CentroUsuario[],
  rolObjetivo?: string | null
) {
  const rolBuscado = normalizarRol(rolObjetivo || "");
  if (!rolBuscado) return [] as string[];

  const correos = new Set<string>();
  usuarios.forEach((usuario) => {
    const roles = obtenerRolesNormalizados(usuario);
    if (!roles.includes(rolBuscado)) return;
    const correo = (usuario.email || "").trim();
    if (correo) correos.add(correo);
  });
  return Array.from(correos);
}

export function buscarUsuarioPorCuenta(
  usuarios: CentroUsuario[],
  cuenta?: string | null
) {
  const cuentaNormalizada = normalizarRol(cuenta || "");
  if (!cuentaNormalizada) return null;

  return (
    usuarios.find((usuario) => {
      const usuarioBase = normalizarRol(usuario.usuario || "");
      return usuarioBase === cuentaNormalizada;
    }) || null
  );
}
