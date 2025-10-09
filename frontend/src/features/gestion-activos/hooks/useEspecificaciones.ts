import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "../constants";
import type { Especificacion } from "../types";

export function useEspecificaciones() {
  const [specs, setSpecs] = useState<Especificacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEspecificaciones = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/especificaciones`);
      const json = await response.json();

      if (!json.ok) {
        throw new Error(json.error || "Error al listar especificaciones");
      }

      setSpecs(Array.isArray(json.data) ? json.data : []);
    } catch (err: any) {
      setError(err.message);
      setSpecs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEspecificaciones();
  }, [fetchEspecificaciones]);

  return {
    specs,
    loading,
    error,
    refetch: fetchEspecificaciones,
  };
}
