import type { Activo } from "../types";

export type ValidationError = {
  field: string;
  message: string;
};

export function validateActivo(activo: Partial<Activo>, isEdit: boolean): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validaciones solo para crear (no para editar)
  if (!isEdit) {
    if (!activo.categoria || activo.categoria.trim() === "") {
      errors.push({ field: "categoria", message: "La categoría es obligatoria" });
    }

    if (!activo.marca || activo.marca.trim() === "") {
      errors.push({ field: "marca", message: "La marca es obligatoria" });
    }

    if (!activo.modelo || activo.modelo.trim() === "") {
      errors.push({ field: "modelo", message: "El modelo es obligatorio" });
    }

    if (!activo.numeroSerie || activo.numeroSerie.trim() === "") {
      errors.push({ field: "numeroSerie", message: "El número de serie es obligatorio" });
    }

    if (!activo.fechaCompra || activo.fechaCompra.trim() === "") {
      errors.push({ field: "fechaCompra", message: "La fecha de compra es obligatoria" });
    }
  }

  // Validaciones generales (crear y editar)
  if (activo.fechaCompra) {
    const fechaCompra = new Date(activo.fechaCompra);
    const hoy = new Date();
    if (fechaCompra > hoy) {
      errors.push({ field: "fechaCompra", message: "La fecha de compra no puede ser futura" });
    }
  }

  if (activo.fechaAsignacion && activo.fechaCompra) {
    const fechaAsignacion = new Date(activo.fechaAsignacion);
    const fechaCompra = new Date(activo.fechaCompra);
    if (fechaAsignacion < fechaCompra) {
      errors.push({
        field: "fechaAsignacion",
        message: "La fecha de asignación no puede ser anterior a la fecha de compra",
      });
    }
  }

  if (activo.asignadoPara && activo.asignadoPara.trim() !== "" && !activo.fechaAsignacion) {
    errors.push({
      field: "fechaAsignacion",
      message: "Debe especificar la fecha de asignación si asigna el activo",
    });
  }

  return errors;
}

export function getValidationErrorMessage(errors: ValidationError[], field: string): string | null {
  const error = errors.find((e) => e.field === field);
  return error ? error.message : null;
}
