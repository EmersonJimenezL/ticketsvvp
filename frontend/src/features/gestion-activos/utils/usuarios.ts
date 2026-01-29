import type { CentroUsuario } from "../types";

export function getUsuarioLabel(usuario: CentroUsuario) {
  const parts = [usuario.pnombre, usuario.papellido].filter(
    (part) => part && part.trim() !== ""
  );
  const label = parts.join(" ").trim();
  return label || usuario.usuario || usuario.email || "";
}
