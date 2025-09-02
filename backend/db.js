// src/db.js
// Modelo Mongoose para la colección **ticketvvp** dentro de la BD **vvp**.
// IMPORTANTE: aquí SOLO definimos el modelo. La CONEXIÓN a Mongo va en server.js.

const mongoose = require("mongoose");

/**
 * Esquema del ticket:
 * - Se fuerza la colección a "ticketvvp" para evitar la pluralización automática.
 * - Si más adelante no quieres aceptar campos fuera de este esquema, deja strict (por defecto true).
 */
const ticketSchema = new mongoose.Schema(
  {
    // Identificador propio del ticket (distinto del _id de Mongo).
    ticketId: { type: String, required: true, unique: true },

    // Área o sistema afectado (controlado por enumeración).
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

    // Descripción del problema o solicitud.
    description: { type: String, required: true, trim: true },

    // Datos mínimos del solicitante.
    userId: { type: String, required: true },
    userName: { type: String, required: true },

    // Nivel de riesgo percibido.
    risk: {
      type: String,
      required: true,
      enum: ["alto", "medio", "bajo"],
      default: "bajo",
    },

    // Estado del ticket en el flujo.
    state: {
      type: String,
      required: true,
      enum: ["recibido", "enProceso", "resuelto", "conDificultades"],
      default: "recibido",
    },

    // Marca de tiempo inicial (además del _id, útil para reportes simples).
    ticketTime: { type: Date, default: Date.now },

    // Se completa cuando state pasa a "resuelto".
    resolucionTime: { type: Date, default: Date.now },

    // Comentario libre.
    comment: { type: String, trim: true },
  },
  {
    // Fuerza el uso de la colección exacta (evita "tickets" o "ticketvvps").
    collection: "ticketvvp",

    // Opcional: si quieres createdAt/updatedAt automáticos, descomenta:
    // timestamps: true,
  }
);

// Índice único explícito por si en producción desactivas autoIndex.
ticketSchema.index({ ticketId: 1 }, { unique: true });

// Nombre del modelo puede ser cualquiera; la colección ya está fija arriba.
const Ticket = mongoose.model("TicketVVP", ticketSchema);

module.exports = Ticket;
