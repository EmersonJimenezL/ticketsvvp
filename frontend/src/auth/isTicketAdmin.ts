export const ALLOWED = new Set(["igonzalez", "mcontreras", "ejimenez"]);

export function isTicketAdmin(u?: { rol?: string; nombreUsuario?: string }) {
  return (
    !!u &&
    u.rol === "admin" &&
    !!u.nombreUsuario &&
    ALLOWED.has(u.nombreUsuario)
  );
}
