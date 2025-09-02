import { httpJSON } from "../lib/http";

export type LoginPayload = { nombreUsuario: string; password: string };
export type LoginResponse = {
  mensaje: string;
  usuario: {
    nombreUsuario: string;
    rol: string;
    primerNombre?: string;
    primerApellido?: string;
  };
};

export function login(data: LoginPayload) {
  return httpJSON<LoginResponse>("auth", "/usuarios/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
