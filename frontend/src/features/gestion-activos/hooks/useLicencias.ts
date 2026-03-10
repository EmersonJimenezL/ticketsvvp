import { useCallback, useState } from "react";
import { API_BASE } from "../constants";
import type { Licencia } from "../types";
import {
  getCuentaAssignedSearchValue,
  getCuentaSearchValue,
  isCuentaDisponible,
} from "../utils/licenciaCuenta";

export function useLicencias() {
  const [licencias, setLicencias] = useState<Licencia[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizeProveedor = (value: unknown): Licencia["proveedor"] => {
    const normalized = String(value || "").trim().toUpperCase();
    if (normalized === "SAP") return "SAP";
    if (normalized === "OFFICE") return "OFFICE";
    return value as Licencia["proveedor"];
  };

  const fetchLicencias = useCallback(async (filters: any = {}, page: number = 1, pageSize: number = 10) => {
    try {
      setLoading(true);
      setError(null);

      // Preparar parámetros de filtros (excepto búsqueda unificada y soloDisponibles que se aplicarán en frontend)
      const params = new URLSearchParams();

      if (filters.cuenta) {
        params.set("cuenta", filters.cuenta);
      }

      if (filters.proveedor) params.set("proveedor", filters.proveedor);
      if (filters.tipoLicencia) params.set("tipoLicencia", filters.tipoLicencia);
      if (filters.desdeCompra) params.set("desdeCompra", filters.desdeCompra);
      if (filters.hastaCompra) params.set("hastaCompra", filters.hastaCompra);
      if (filters.sucursal) params.set("sucursal", filters.sucursal);

      // Obtener TODAS las licencias (sin paginación, usamos un límite alto)
      const licParams = new URLSearchParams(params);
      licParams.set("limit", "1000");
      licParams.set("skip", "0");
      const licResponse = await fetch(`${API_BASE}/licencias?${licParams.toString()}`).catch(() => null);

      // Obtener TODOS los activos con categoría "licencias" (sin paginación)
      const activosLicParams = new URLSearchParams();
      activosLicParams.set("categoria", "licencias");
      activosLicParams.set("limit", "1000");
      activosLicParams.set("skip", "0");
      if (filters.sucursal) {
        activosLicParams.set("sucursal", filters.sucursal);
      }

      const activosLicResponse = await fetch(`${API_BASE}/activos?${activosLicParams.toString()}`).catch(() => null);

      const allLicencias: Licencia[] = [];

      // Procesar licencias normales
      if (licResponse) {
        const json = await licResponse.json();
        if (json?.ok && Array.isArray(json.data)) {
          allLicencias.push(
            ...json.data.map((item: Licencia) => ({
              ...item,
              proveedor: normalizeProveedor(item?.proveedor),
            }))
          );
        }
      }

      // Procesar activos-licencias
      if (activosLicResponse) {
        const json = await activosLicResponse.json();
        if (json?.ok && Array.isArray(json.data)) {
          allLicencias.push(
            ...json.data.map((item: any) => ({
              _id: item?._id,
              proveedor: normalizeProveedor(item?.licencia?.proveedor),
              cuenta: item?.licencia?.cuenta,
              tipoLicencia: item?.licencia?.tipoLicencia,
              fechaCompra: item?.fechaCompra,
              sucursal: item?.sucursal,
              asignadoPara: item?.licencia?.usuarioNombre || item?.asignadoPara,
              fechaAsignacion: item?.licencia?.asignadaEn || item?.fechaAsignacion || undefined,
              activoId: item?._id,
              notas: item?.notas,
              createdAt: item?.createdAt,
              updatedAt: item?.updatedAt,
            }))
          );
        }
      }

      // APLICAR FILTROS EN EL FRONTEND
      let filteredLicencias = allLicencias;

      // Filtro de búsqueda unificada (busca en cuenta Y asignadoPara)
      if (filters.busqueda) {
        const searchLower = filters.busqueda.toLowerCase();
        filteredLicencias = filteredLicencias.filter((lic) => {
          const cuenta = getCuentaSearchValue(lic.cuenta);
          const asignado =
            (lic.asignadoPara || "").toLowerCase() ||
            getCuentaAssignedSearchValue(lic.cuenta);
          return cuenta.includes(searchLower) || asignado.includes(searchLower);
        });
      }

      // Filtro de solo disponibles (sin asignadoPara)
      if (filters.soloDisponibles) {
        filteredLicencias = filteredLicencias.filter((lic) => {
          const asignado =
            (lic.asignadoPara || "").trim() ||
            getCuentaAssignedSearchValue(lic.cuenta).trim();
          return !asignado || isCuentaDisponible(lic.cuenta);
        });
      }

      // APLICAR PAGINACIÓN EN EL FRONTEND sobre el array filtrado
      const totalFiltered = filteredLicencias.length;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedLicencias = filteredLicencias.slice(startIndex, endIndex);

      setLicencias(paginatedLicencias);
      setTotalCount(totalFiltered);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createLicencia = useCallback(async (data: Partial<Licencia>) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/licencias`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await response.json();

      if (!json.ok) {
        throw new Error(json.error || "Error al crear licencia");
      }

      return json.data;
    } catch (err: any) {
      setError(err.message || "Error al crear licencia");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateLicencia = useCallback(async (id: string, data: Partial<Licencia>) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/licencias/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await response.json();

      if (!json.ok) {
        throw new Error(json.error || "Error al actualizar licencia");
      }

      return json.data;
    } catch (err: any) {
      setError(err.message || "Error al actualizar licencia");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteLicencia = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/licencias/${id}`, {
        method: "DELETE",
      });
      const json = await response.json();

      if (!json.ok) {
        throw new Error(json.error || "Error al eliminar licencia");
      }
    } catch (err: any) {
      setError(err.message || "Error al eliminar licencia");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    licencias,
    totalCount,
    loading,
    error,
    fetchLicencias,
    createLicencia,
    updateLicencia,
    deleteLicencia,
  };
}
