// Usuarios autorizados para gestionar tickets:
// - igonzalez: Ignacio González
// - mcontreras: Mauricio Contreras
// - ejimenez: Emerson Jiménez
export const ALLOWED = new Set(["igonzalez", "mcontreras", "ejimenez"]);

export function isTicketAdmin(u?: { rol?: string | string[]; nombreUsuario?: string; usuario?: string }) {
  // Si el usuario está en la lista ALLOWED, tiene acceso sin importar su rol
  const username = u?.nombreUsuario || u?.usuario;
  return !!u && !!username && ALLOWED.has(username);
}
