type UserWithRoles = {
  rol?: string | string[];
};

function getNormalizedRoles(u?: UserWithRoles): string[] {
  const roles = Array.isArray(u?.rol)
    ? u.rol
    : u?.rol
      ? [u.rol]
      : [];

  return roles
    .map((role) => role.trim().toLowerCase())
    .filter(Boolean);
}

export function isTicketAdmin(u?: UserWithRoles) {
  const roles = getNormalizedRoles(u);
  return roles.includes("admin");
}

export function canAssignTicketsByRole(u?: UserWithRoles) {
  const roles = getNormalizedRoles(u);
  return roles.includes("admin") && roles.includes("jefe");
}
