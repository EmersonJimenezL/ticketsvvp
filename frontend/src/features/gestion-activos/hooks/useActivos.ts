import { useCallback, useState } from "react";
import { API_BASE } from "../constants";
import type { Activo } from "../types";

export function useActivos() {
  const [activos, setActivos] = useState<Activo[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivos = useCallback(async (filters: any = {}, page: number = 1, pageSize: number = 25) => {
    try {
      setLoading(true);
      setError(null);

      const skip = (page - 1) * pageSize;
      const params = new URLSearchParams();
      params.set("skip", String(skip));
      params.set("limit", String(pageSize));

      if (filters.soloSinAsignacion) params.set("soloSinAsignacion", "1");
      if (filters.categoria) params.set("categoria", filters.categoria);
      if (filters.sucursal) params.set("sucursal", filters.sucursal);
      if (filters.desdeCompra) params.set("desdeCompra", filters.desdeCompra);
      if (filters.hastaCompra) params.set("hastaCompra", filters.hastaCompra);
      if (filters.desdeAsignacion) params.set("desdeAsign", filters.desdeAsignacion);
      if (filters.hastaAsignacion) params.set("hastaAsign", filters.hastaAsignacion);

      const response = await fetch(`${API_BASE}/activos?${params.toString()}`);
      const json = await response.json();

      if (!json.ok) {
        throw new Error(json.error || "Error al listar activos");
      }

      setActivos(json.data);
      setTotalCount(json.total || json.data.length);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createActivo = useCallback(async (data: Partial<Activo>) => {
    const response = await fetch(`${API_BASE}/activos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await response.json();

    if (!json.ok) {
      throw new Error(json.error || "Error al crear");
    }

    return json.data;
  }, []);

  const updateActivo = useCallback(async (id: string, data: Partial<Activo>) => {
    const response = await fetch(`${API_BASE}/activos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await response.json();

    if (!json.ok) {
      throw new Error(json.error || "Error al actualizar");
    }

    return json.data;
  }, []);

  const deleteActivo = useCallback(async (id: string) => {
    const response = await fetch(`${API_BASE}/activos/${id}`, {
      method: "DELETE",
    });
    const json = await response.json();

    if (!json.ok) {
      throw new Error(json.error || "Error al eliminar");
    }
  }, []);

  return {
    activos,
    totalCount,
    loading,
    error,
    fetchActivos,
    createActivo,
    updateActivo,
    deleteActivo,
  };
}
