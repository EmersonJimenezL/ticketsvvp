import type { Licencia } from "../types";

export type ValidationError = {
  field: string;
  message: string;
};

export function validateLicencia(licencia: Partial<Licencia>, isEdit: boolean): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validaciones solo para crear (no para editar)
  if (!isEdit) {
    if (!licencia.proveedor) {
      errors.push({ field: "proveedor", message: "El proveedor es obligatorio" });
    }

    if (!licencia.tipoLicencia || licencia.tipoLicencia.trim() === "") {
      errors.push({ field: "tipoLicencia", message: "El tipo de licencia es obligatorio" });
    }

    if (!licencia.cuenta || licencia.cuenta.trim() === "") {
      errors.push({ field: "cuenta", message: "La cuenta es obligatoria" });
    }

    if (!licencia.fechaCompra || licencia.fechaCompra.trim() === "") {
      errors.push({ field: "fechaCompra", message: "La fecha de compra es obligatoria" });
    }
  }

  // Validaciones generales (crear y editar)
  if (licencia.fechaCompra) {
    const fechaCompra = new Date(licencia.fechaCompra);
    const hoy = new Date();
    if (fechaCompra > hoy) {
      errors.push({ field: "fechaCompra", message: "La fecha de compra no puede ser futura" });
    }
  }

  if (licencia.fechaAsignacion && licencia.fechaCompra) {
    const fechaAsignacion = new Date(licencia.fechaAsignacion);
    const fechaCompra = new Date(licencia.fechaCompra);
    if (fechaAsignacion < fechaCompra) {
      errors.push({
        field: "fechaAsignacion",
        message: "La fecha de asignación no puede ser anterior a la fecha de compra",
      });
    }
  }

  if (licencia.asignadoPara && licencia.asignadoPara.trim() !== "" && !licencia.fechaAsignacion) {
    errors.push({
      field: "fechaAsignacion",
      message: "Debe especificar la fecha de asignación si asigna la licencia",
    });
  }

  return errors;
}

export function getValidationErrorMessage(errors: ValidationError[], field: string): string | null {
  const error = errors.find((e) => e.field === field);
  return error ? error.message : null;
}
