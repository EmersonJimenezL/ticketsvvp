// backend/db.js
const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

/* =========================
 * TICKETS (se mantiene igual)
 * ========================= */
const ticketSchema = new Schema(
  {
    ticketId: { type: String, required: true, unique: true },
    title: {
      type: String,
      required: true,
      enum: [
        "SAP",
        "Impresoras",
        "Cuentas",
        "Rinde Gastos",
        "Terreno",
        "Otros",
      ],
    },
    description: { type: String, required: true, trim: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    risk: { type: String, enum: ["alto", "medio", "bajo"], default: "bajo" },
    state: {
      type: String,
      enum: ["recibido", "enProceso", "resuelto", "conDificultades"],
      default: "recibido",
    },
    comment: { type: String, trim: true },
    // Imágenes adjuntas en formato data URL (base64). Opcional.
    images: { type: [String], default: [] },
    ticketTime: { type: Date },
    resolucionTime: { type: Date },
  },
  // Forzar colección para alinear con la existente en Mongo
  { timestamps: true, collection: "ticketvvp" }
);
const Ticket = mongoose.models.Ticket || mongoose.model("Ticket", ticketSchema);

/* =========================
 * ACTIVOS (según nueva especificación)
 * ========================= */
const activoSchema = new Schema(
  {
    categoria: { type: String, trim: true },
    marca: { type: String, trim: true },
    modelo: { type: String, trim: true },
    numeroSerie: { type: String, trim: true, index: true },
    fechaCompra: { type: Date },

    asignadoPara: { type: String, trim: true },
    fechaAsignacion: { type: Date },
  },
  { timestamps: true }
);
const Activo = mongoose.models.Activo || mongoose.model("Activo", activoSchema);

/* =========================
 * LICENCIAS (según nueva especificación)
 * ========================= */
const licenciaSchema = new Schema(
  {
    proveedor: { type: String, enum: ["SAP", "Office"], required: true },
    cuenta: { type: String, trim: true },
    tipoLicencia: {
      type: String,
      trim: true,
      enum: [
        "Profesional",
        "CRM limitado",
        "Logistica limitada",
        "acceso directo",
        "Financiera limitada",
      ],
    },
    fechaCompra: { type: Date },

    asignadoPara: { type: String, trim: true },
    fechaAsignacion: { type: Date },
  },
  { timestamps: true }
);
const Licencia =
  mongoose.models.Licencia || mongoose.model("Licencia", licenciaSchema);

/* =========================
 * HISTÓRICOS (un doc por recurso, array de movimientos)
 * ========================= */
const historicoSchema = new Schema(
  {
    // "activo" o "licencia"
    tipo: { type: String, required: true, enum: ["activo", "licencia"] },
    refId: { type: Types.ObjectId, required: true, index: true },
    // compatibilidad: permitir índice legado activoId_1 para evitar null
    activoId: { type: Types.ObjectId, index: true },

    // lista cronológica de asignaciones
    movimientos: [
      {
        usuario: { type: String, trim: true },
        accion: { type: String, trim: true }, // asignado | reasignado
        fecha: { type: Date, default: Date.now },
        observacion: { type: String, trim: true },
        por: { type: String, trim: true },
        desde: { type: String, trim: true },
        hasta: { type: String, trim: true },
      },
    ],
  },
  { timestamps: true }
);
historicoSchema.index({ tipo: 1, refId: 1 }, { unique: true });

const Historico =
  mongoose.models.Historico || mongoose.model("Historico", historicoSchema);

/* =========================
 * EXPORTS
 * ========================= */
module.exports = {
  Ticket,
  Activo,
  Licencia,
  Historico,
};
