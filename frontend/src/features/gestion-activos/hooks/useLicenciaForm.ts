import { useCallback, useState } from "react";
import type { Licencia } from "../types";

const EMPTY_FORM: Licencia = {
  proveedor: undefined,
  cuenta: "",
  tipoLicencia: "",
  fechaCompra: "",
  sucursal: "",
  centroCosto: "",
  asignadoPara: "",
  fechaAsignacion: "",
};

export function useLicenciaForm() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Licencia>(EMPTY_FORM);

  const openCreate = useCallback(() => {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  }, []);

  const openEdit = useCallback((licencia: Licencia) => {
    // No editable si viene de activos mapeados
    if (licencia.activoId) return;

    setEditId(licencia._id || null);
    setForm({
      proveedor: licencia.proveedor || undefined,
      cuenta: licencia.cuenta || "",
      tipoLicencia: licencia.tipoLicencia || "",
      fechaCompra: (licencia.fechaCompra || "").slice(0, 10),
      sucursal: licencia.sucursal || "",
      centroCosto: licencia.centroCosto || "",
      asignadoPara: licencia.asignadoPara || "",
      fechaAsignacion: (licencia.fechaAsignacion || "").slice(0, 10),
      _id: licencia._id,
    });
    setShowForm(true);
  }, []);

  const updateForm = useCallback((changes: Partial<Licencia>) => {
    setForm((prev) => ({ ...prev, ...changes }));
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
  }, []);

  const resetForm = useCallback(() => {
    setForm({ ...EMPTY_FORM });
    setEditId(null);
    setShowForm(false);
  }, []);

  return {
    showForm,
    editId,
    form,
    isEdit: !!editId,
    openCreate,
    openEdit,
    updateForm,
    closeForm,
    resetForm,
  };
}
