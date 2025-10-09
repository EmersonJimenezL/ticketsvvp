import { useCallback, useState } from "react";
import type { Activo } from "../types";

const EMPTY_FORM: Activo = {
  categoria: "",
  marca: "",
  modelo: "",
  fechaCompra: "",
  numeroSerie: "",
  numeroFactura: "",
  detalles: "",
  sucursal: "",
  centroCosto: "",
  asignadoPara: "",
  fechaAsignacion: "",
};

export function useActivoForm() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Activo>(EMPTY_FORM);

  const openCreate = useCallback(() => {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  }, []);

  const openEdit = useCallback((activo: Activo) => {
    setEditId(activo._id || null);
    setForm({
      categoria: activo.categoria || "",
      marca: activo.marca || "",
      modelo: activo.modelo || "",
      fechaCompra: (activo.fechaCompra || "").slice(0, 10),
      numeroSerie: activo.numeroSerie || "",
      numeroFactura: activo.numeroFactura || "",
      detalles: activo.detalles || "",
      sucursal: activo.sucursal || "",
      centroCosto: activo.centroCosto || "",
      asignadoPara: activo.asignadoPara || "",
      fechaAsignacion: (activo.fechaAsignacion || "").slice(0, 10),
    });
    setShowForm(true);
  }, []);

  const updateForm = useCallback((changes: Partial<Activo>) => {
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
