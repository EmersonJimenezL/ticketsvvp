type Bases = "auth" | "tickets";

const API_BASE = import.meta.env.VITE_API_BASE!;

const BASES: Record<Bases, string> = {
  auth: API_BASE,
  tickets: API_BASE,
};

export async function httpJSON<T>(
  base: Bases,
  path: string,
  init?: RequestInit
): Promise<T> {
  try {
    const res = await fetch(`${BASES[base]}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });

    if (!res.ok) {
      // Mensajes específicos para códigos de error comunes
      if (res.status === 413) {
        throw new Error("Las imágenes son demasiado grandes. Intenta con menos imágenes o de menor tamaño.");
      }
      if (res.status === 404) {
        throw new Error("El recurso solicitado no existe.");
      }
      if (res.status === 500) {
        throw new Error("Error en el servidor. Por favor, intenta más tarde.");
      }
      if (res.status === 401 || res.status === 403) {
        throw new Error("No tienes permisos para realizar esta acción.");
      }

      // Intentar obtener mensaje del servidor
      const text = await res.text().catch(() => "");
      throw new Error(text || `Error HTTP ${res.status}`);
    }

    return res.json() as Promise<T>;
  } catch (err: any) {
    // Errores de red (sin conexión, CORS, etc.)
    if (err.message?.includes("Failed to fetch") || err.name === "TypeError") {
      throw new Error("No se pudo conectar con el servidor. Verifica tu conexión a internet.");
    }
    // Re-lanzar el error si ya tiene un mensaje personalizado
    throw err;
  }
}
