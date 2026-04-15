import { useCallback, useState } from "react";
import { API_BASE } from "../constants";
import type { Activo } from "../types";

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function buildActivoSearchIndex(activo: Activo) {
  const rawValues = [
    activo.categoria,
    activo.marca,
    activo.modelo,
    activo.numeroSerie,
    activo.numeroFactura,
    activo.detalles,
    activo.sucursal,
    activo.centroCosto,
    activo.asignadoPara,
    ...(Array.isArray(activo.numeroacta) ? activo.numeroacta : []),
  ];

  return normalizeSearchValue(rawValues.filter(Boolean).join(" "));
}

function matchesActivoSearch(activo: Activo, search: string) {
  const normalizedSearch = normalizeSearchValue(search);
  if (!normalizedSearch) return true;

  const haystack = buildActivoSearchIndex(activo);
  if (!haystack) return false;

  return normalizedSearch
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

export function useActivos() {
  const [activos, setActivos] = useState<Activo[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivos = useCallback(async (filters: any = {}, page: number = 1, pageSize: number = 10) => {
    try {
      setLoading(true);
      setError(null);

      const skip = (page - 1) * pageSize;
      const busquedaFiltro =
        typeof filters.busqueda === "string" ? filters.busqueda.trim() : "";
      const marcaFiltro =
        typeof filters.marca === "string" ? filters.marca.trim() : "";
      const modeloFiltro =
        typeof filters.modelo === "string" ? filters.modelo.trim() : "";
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

      // Fallback frontend para filtros de marca/modelo (coincidencia parcial),
      // por si el backend no soporta estos filtros o los evalua exacto.
      if (busquedaFiltro || marcaFiltro || modeloFiltro) {
        params.set("skip", "0");
        params.set("limit", "5000");

        const response = await fetch(`${API_BASE}/activos?${params.toString()}`);
        const json = await response.json();

        if (!json.ok) {
          throw new Error(json.error || "Error al listar activos");
        }

        const data: Activo[] = Array.isArray(json.data) ? json.data : [];
        let filtrados = data;
        if (marcaFiltro) {
          const needleMarca = marcaFiltro.toLowerCase();
          filtrados = filtrados.filter((item) =>
            (item.marca || "").toLowerCase().includes(needleMarca)
          );
        }
        if (modeloFiltro) {
          const needleModelo = modeloFiltro.toLowerCase();
          filtrados = filtrados.filter((item) =>
            (item.modelo || "").toLowerCase().includes(needleModelo)
          );
        }
        if (busquedaFiltro) {
          filtrados = filtrados.filter((item) =>
            matchesActivoSearch(item, busquedaFiltro)
          );
        }

        setTotalCount(filtrados.length);
        setActivos(filtrados.slice(skip, skip + pageSize));
        return;
      }

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
    try {
      setLoading(true);
      setError(null);
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
    } catch (err: any) {
      setError(err.message || "Error al crear");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateActivo = useCallback(async (id: string, data: Partial<Activo>) => {
    try {
      setLoading(true);
      setError(null);
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
    } catch (err: any) {
      setError(err.message || "Error al actualizar");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteActivo = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/activos/${id}`, {
        method: "DELETE",
      });
      const json = await response.json();

      if (!json.ok) {
        throw new Error(json.error || "Error al eliminar");
      }
    } catch (err: any) {
      setError(err.message || "Error al eliminar");
      throw err;
    } finally {
      setLoading(false);
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
