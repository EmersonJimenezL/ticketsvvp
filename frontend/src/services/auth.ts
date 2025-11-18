export type Usuario = {
  _id: string;
  usuario: string;
  pnombre: string;
  snombre: string;
  papellido: string;
  sapellido: string;
  email: string;
  sucursal: string;
  area: string;
  rol: string[];
  activo: boolean;
  permisos: string[];
  createdAt: string;
  updatedAt: string;
  __v: number;
};

export type LoginPayload = {
  usuario: string;
  password: string;
};

export type LoginResponse = {
  status: string;
  message: string;
  token: string;
  data: Usuario;
};

export type LoginError = {
  error: string;
};

const API_URL = "http://192.168.200.80:3005/centrodeaplicaciones/login";

export async function login(usuario: string, password: string): Promise<LoginResponse> {
  const requestBody: LoginPayload = {
    usuario,
    password,
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as LoginError;
      throw new Error(errorData.error || "Error al iniciar sesión");
    }

    return data as LoginResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Error de conexión. Por favor, intente nuevamente.");
  }
}
