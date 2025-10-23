// Usuarios autorizados para gestionar tickets:
// - igonzalez: Ignacio González
// - mcontreras: Mauricio Contreras
// - ejimenez: Emerson Jiménez
export const ALLOWED = new Set(["igonzalez", "mcontreras", "ejimenez"]);

export function isTicketAdmin(u?: { rol?: string; nombreUsuario?: string }) {
  // Si el usuario está en la lista ALLOWED, tiene acceso sin importar su rol
  return !!u && !!u.nombreUsuario && ALLOWED.has(u.nombreUsuario);
}
