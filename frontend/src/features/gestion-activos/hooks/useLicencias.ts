import { useCallback, useState } from "react";
import { API_BASE } from "../constants";
import type { Licencia } from "../types";

export function useLicencias() {
  const [licencias, setLicencias] = useState<Licencia[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLicencias = useCallback(async (filters: any = {}, page: number = 1, pageSize: number = 10) => {
    try {
      setLoading(true);
      setError(null);

      const skip = (page - 1) * pageSize;
      const params = new URLSearchParams();
      params.set("skip", String(skip));
      params.set("limit", String(pageSize));

      // Si soloDisponibles está activo, buscar por "disponible"
      if (filters.soloDisponibles) {
        params.set("cuenta", "disponible");
      } else if (filters.cuenta) {
        params.set("cuenta", filters.cuenta);
      }

      if (filters.proveedor) params.set("proveedor", filters.proveedor);
      if (filters.tipoLicencia) params.set("tipoLicencia", filters.tipoLicencia);
      if (filters.asignadoPara) params.set("asignadoPara", filters.asignadoPara);
      if (filters.desdeCompra) params.set("desdeCompra", filters.desdeCompra);
      if (filters.hastaCompra) params.set("hastaCompra", filters.hastaCompra);
      if (filters.sucursal) params.set("sucursal", filters.sucursal);

      // Fetch licencias normales
      const licResponse = await fetch(`${API_BASE}/licencias?${params.toString()}`).catch(() => null);

      // Fetch activos con categoría "licencias"
      const activosLicParams = new URLSearchParams();
      activosLicParams.set("categoria", "licencias");
      activosLicParams.set("skip", String(skip));
      activosLicParams.set("limit", String(pageSize));
      if (filters.sucursal) {
        activosLicParams.set("sucursal", filters.sucursal);
      }

      const activosLicResponse = await fetch(`${API_BASE}/activos?${activosLicParams.toString()}`).catch(() => null);

      const merged: Licencia[] = [];
      let totalLic = 0;
      let totalActivos = 0;

      // Procesar licencias normales
      if (licResponse) {
        const json = await licResponse.json();
        if (json?.ok && Array.isArray(json.data)) {
          merged.push(...json.data);
          totalLic = json.total || 0;
        }
      }

      // Procesar activos-licencias
      if (activosLicResponse) {
        const json = await activosLicResponse.json();
        if (json?.ok && Array.isArray(json.data)) {
          merged.push(
            ...json.data.map((item: any) => ({
              _id: item?._id,
              proveedor: item?.licencia?.proveedor,
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
          totalActivos = json.total || 0;
        }
      }

      setLicencias(merged);
      setTotalCount(totalLic + totalActivos);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createLicencia = useCallback(async (data: Partial<Licencia>) => {
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
  }, []);

  const updateLicencia = useCallback(async (id: string, data: Partial<Licencia>) => {
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
  }, []);

  const deleteLicencia = useCallback(async (id: string) => {
    const response = await fetch(`${API_BASE}/licencias/${id}`, {
      method: "DELETE",
    });
    const json = await response.json();

    if (!json.ok) {
      throw new Error(json.error || "Error al eliminar licencia");
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
