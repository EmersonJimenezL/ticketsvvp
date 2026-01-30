export function isContaAdmin(u?: { rol?: string | string[] }) {
  const roles = Array.isArray(u?.rol)
    ? u?.rol
    : u?.rol
      ? [u.rol]
      : [];
  return roles.includes("jfconta");
}
