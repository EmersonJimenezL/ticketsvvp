// backend/server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const { Activo, Licencia, Historico, Ticket } = require("./db");

const app = express();
app.use(cors({ origin: true, credentials: true }));
// Aumentar límite para permitir imágenes en base64 en tickets
app.use(express.json({ limit: "10mb" }));

/* ===== Mongo ===== */
async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("Falta MONGO_URI en .env");
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log("[mongo] conectado");
}
connectDB().catch((e) => {
  console.error("[mongo] error:", e.message);
  process.exit(1);
});

/* ===== Helpers ===== */
// Validaciones de creación
function assertActivoCreate(b) {
  const req = ["categoria", "marca", "modelo", "numeroSerie", "fechaCompra"];
  const missing = req.filter((k) => b?.[k] == null || b[k] === "");
  return missing.length ? `Faltan campos: ${missing.join(", ")}` : null;
}
function assertLicenciaCreate(b) {
  const req = ["proveedor", "tipoLicencia", "fechaCompra", "cuenta"];
  const missing = req.filter((k) => b?.[k] == null || b[k] === "");
  return missing.length ? `Faltan campos: ${missing.join(", ")}` : null;
}

// upsert + push movimiento
async function pushMovimiento({ tipo, refId, movimiento }) {
  // compat: aseguramos activoId = refId para no chocar con índices antiguos
  return Historico.updateOne(
    { tipo, refId },
    { $setOnInsert: { activoId: refId }, $push: { movimientos: movimiento } },
    { upsert: true }
  );
}

/* =========================
 * ACTIVOS
 * ========================= */

// Crear ACTIVO
app.post("/api/activos", async (req, res) => {
  try {
    const err = assertActivoCreate(req.body);
    if (err) return res.status(400).json({ ok: false, error: err });

    const doc = await Activo.create(req.body);

    // Si viene asignadoA al crear, guardamos movimiento "asignado"
    if (doc.asignadoPara) {
      await pushMovimiento({
        tipo: "activo",
        refId: doc._id,
        movimiento: {
          usuario: doc.asignadoPara,
          accion: "asignado",
          fecha: doc.fechaAsignacion || new Date(),
          observacion: req.body._observacion || "",
          por: req.body._por || "",
          desde: "",
          hasta: doc.asignadoPara,
        },
      });
    }

    res.status(201).json({ ok: true, data: doc });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Editar ACTIVO (libre) + historial si cambia asignación
app.patch("/api/activos/:id", async (req, res) => {
  try {
    const before = await Activo.findById(req.params.id);
    if (!before)
      return res.status(404).json({ ok: false, error: "No encontrado" });

    const doc = await Activo.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    // Detectar cambio de asignación
    const prev = before.asignadoPara || "";
    const next = doc.asignadoPara || "";
    if (prev !== next && next) {
      const accion = !prev ? "asignado" : "reasignado";
      await pushMovimiento({
        tipo: "activo",
        refId: doc._id,
        movimiento: {
          usuario: next,
          accion,
          fecha: req.body.fechaAsignacion || new Date(),
          observacion: req.body._observacion || "",
          por: req.body._por || "",
          desde: prev,
          hasta: next,
        },
      });
    }

    res.json({ ok: true, data: doc });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Borrar ACTIVO
app.delete("/api/activos/:id", async (req, res) => {
  try {
    const doc = await Activo.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, error: "No encontrado" });
    res.json({ ok: true, data: doc });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Listar ACTIVO
app.get("/api/activos", async (req, res) => {
  try {
    const q = {};
    if (req.query.soloSinAsignacion === "1") {
      q.$or = [
        { asignadoPara: { $exists: false } },
        { asignadoPara: null },
        { asignadoPara: "" },
      ];
    }
    if (req.query.categoria) q.categoria = req.query.categoria;

    if (req.query.desdeCompra || req.query.hastaCompra) {
      q.fechaCompra = {};
      if (req.query.desdeCompra)
        q.fechaCompra.$gte = new Date(req.query.desdeCompra);
      if (req.query.hastaCompra)
        q.fechaCompra.$lte = new Date(req.query.hastaCompra);
    }
    if (req.query.desdeAsign || req.query.hastaAsign) {
      q.fechaAsignacion = {};
      if (req.query.desdeAsign)
        q.fechaAsignacion.$gte = new Date(req.query.desdeAsign);
      if (req.query.hastaAsign)
        q.fechaAsignacion.$lte = new Date(req.query.hastaAsign);
    }

    const docs = await Activo.find(q).sort({ createdAt: -1 }).limit(500);
    res.json({ ok: true, data: docs });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* =========================
 * LICENCIAS
 * ========================= */

// Crear LICENCIA
app.post("/api/licencias", async (req, res) => {
  try {
    const err = assertLicenciaCreate(req.body);
    if (err) return res.status(400).json({ ok: false, error: err });

    const doc = await Licencia.create(req.body);

    // Si viene asignadoPara al crear (opcional), registra historial
    if (doc.asignadoPara) {
      await pushMovimiento({
        tipo: "licencia",
        refId: doc._id,
        movimiento: {
          usuario: doc.asignadoPara,
          accion: "asignado",
          fecha: doc.fechaAsignacion || new Date(),
          observacion: req.body._observacion || "",
          por: req.body._por || "",
          desde: "",
          hasta: doc.asignadoPara,
        },
      });
    }

    res.status(201).json({ ok: true, data: doc });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Editar LICENCIA (libre) + historial si cambia asignación
app.patch("/api/licencias/:id", async (req, res) => {
  try {
    const before = await Licencia.findById(req.params.id);
    if (!before)
      return res.status(404).json({ ok: false, error: "No encontrada" });

    const doc = await Licencia.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    // Cambio de asignación
    const prev = before.asignadoPara || "";
    const next = doc.asignadoPara || "";
    if (prev !== next && next) {
      const accion = !prev ? "asignado" : "reasignado";
      await pushMovimiento({
        tipo: "licencia",
        refId: doc._id,
        movimiento: {
          usuario: next,
          accion,
          fecha: req.body.fechaAsignacion || new Date(),
          observacion: req.body._observacion || "",
          por: req.body._por || "",
          desde: prev,
          hasta: next,
        },
      });
    }

    res.json({ ok: true, data: doc });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Borrar LICENCIA
app.delete("/api/licencias/:id", async (req, res) => {
  try {
    const doc = await Licencia.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, error: "No encontrada" });
    res.json({ ok: true, data: doc });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Listar LICENCIAS (básico)
app.get("/api/licencias", async (req, res) => {
  try {
    const q = {};
    if (req.query.cuenta) q.cuenta = req.query.cuenta;
    if (req.query.tipoLicencia) q.tipoLicencia = req.query.tipoLicencia;

    if (req.query.desdeCompra || req.query.hastaCompra) {
      q.fechaCompra = {};
      if (req.query.desdeCompra)
        q.fechaCompra.$gte = new Date(req.query.desdeCompra);
      if (req.query.hastaCompra)
        q.fechaCompra.$lte = new Date(req.query.hastaCompra);
    }

    const docs = await Licencia.find(q).sort({ createdAt: -1 }).limit(500);
    res.json({ ok: true, data: docs });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* =========================
 * HISTÓRICOS
 * ========================= */

// Obtener historial por recurso
app.get("/api/historicos/:tipo/:id", async (req, res) => {
  try {
    const { tipo, id } = req.params; // tipo: "activo" | "licencia"
    const doc = await Historico.findOne({ tipo, refId: id });
    res.json({ ok: true, data: doc || null });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* =========================
 * TICKETS
 * ========================= */

// Crear ticket
app.post("/api/ticketvvp", async (req, res) => {
  try {
    const b = req.body || {};
    const required = [
      "ticketId",
      "title",
      "description",
      "userId",
      "userName",
      "risk",
      "state",
    ];
    const missing = required.filter((k) => b?.[k] == null || b[k] === "");
    if (missing.length)
      return res
        .status(400)
        .json({ ok: false, error: `Faltan campos: ${missing.join(", ")}` });

    // Sanitizar imágenes si vienen: solo data URLs de imagen, máx 5
    let images = [];
    if (Array.isArray(b.images)) {
      images = b.images
        .filter((x) => typeof x === "string" && x.startsWith("data:image/"))
        .slice(0, 5);
    }

    const payload = {
      ticketId: b.ticketId,
      title: b.title,
      description: String(b.description || "").trim(),
      userId: b.userId,
      userName: b.userName,
      risk: b.risk,
      state: b.state,
      images,
      ticketTime: b.ticketTime ? new Date(b.ticketTime) : new Date(),
    };
    const doc = await Ticket.create(payload);
    res.status(201).json({ ok: true, data: doc });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Listar tickets
app.get("/api/ticketvvp", async (req, res) => {
  try {
    const q = {};
    if (req.query.userId) q.userId = req.query.userId;
    if (req.query.state) q.state = req.query.state;
    if (req.query.title) q.title = req.query.title;

    const limit = Math.min(Number(req.query.limit) || 50, 500);
    const skip = Math.max(Number(req.query.skip) || 0, 0);

    const docs = await Ticket.find(q)
      .sort({ ticketTime: 1, createdAt: 1 })
      .skip(skip)
      .limit(limit);
    res.json({ ok: true, count: docs.length, data: docs });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Actualizar ticket (risk/state/comment)
app.patch("/api/ticketvvp/:ticketId", async (req, res) => {
  try {
    const { ticketId } = req.params;
    const set = {};
    if (req.body.risk) set.risk = req.body.risk;
    if (req.body.state) set.state = req.body.state;
    if (req.body.comment != null) set.comment = String(req.body.comment);
    if (req.body.state === "resuelto" && !req.body.resolucionTime) {
      set.resolucionTime = new Date();
    }

    const doc = await Ticket.findOneAndUpdate({ ticketId }, { $set: set }, {
      new: true,
      runValidators: true,
    });
    if (!doc) return res.status(404).json({ ok: false, error: "No encontrado" });
    res.json({ ok: true, data: doc });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Pendientes admin (no resueltos)
app.get("/api/admin/tickets/pendientes", async (_req, res) => {
  try {
    const docs = await Ticket.find({ state: { $ne: "resuelto" } })
      .sort({ ticketTime: 1, createdAt: 1 })
      .limit(500);
    res.json({ ok: true, count: docs.length, data: docs });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* =========================
 * Server
 * ========================= */
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`[server] listo en :${PORT}`));
