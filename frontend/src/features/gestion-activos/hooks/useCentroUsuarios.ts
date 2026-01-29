import { useCallback, useEffect, useState } from "react";
import { CENTRO_APLICACIONES_URL } from "../constants";
import type { CentroUsuario } from "../types";

export function useCentroUsuarios() {
  const [usuarios, setUsuarios] = useState<CentroUsuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsuarios = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(CENTRO_APLICACIONES_URL);
      const json = await response.json();

      let items: CentroUsuario[] = [];
      if (Array.isArray(json)) {
        items = json as CentroUsuario[];
      } else if (Array.isArray(json?.data)) {
        items = json.data as CentroUsuario[];
      } else if (Array.isArray(json?.usuarios)) {
        items = json.usuarios as CentroUsuario[];
      } else if (json && typeof json === "object") {
        items = [json as CentroUsuario];
      }

      if (!Array.isArray(items)) {
        throw new Error("Respuesta inválida de centro de aplicaciones");
      }

      const activos = items.filter((u) => u && u.activo !== false);
      setUsuarios(activos);
    } catch (err: any) {
      setError(err.message || "Error cargando usuarios");
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  return {
    usuarios,
    loading,
    error,
    refetch: fetchUsuarios,
  };
}
