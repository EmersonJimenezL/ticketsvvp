// server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Ticket = require("./db");

const app = express();
app.use(express.json({ limit: "2mb" }));

/* ============== CORS ============== */
const ALLOWED = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://192.168.200.80:5173",
];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // Postman/curl
      return ALLOWED.includes(origin)
        ? cb(null, true)
        : cb(new Error("CORS bloqueado"));
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  })
);

// ⚠️ En Express 5 no uses "*" en rutas. Si quieres habilitar preflight explícito:
// app.options("(.*)", cors());  // <- opcional. Puedes omitirla: cors() ya maneja OPTIONS.

/* ============ Mongo ============ */
async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("Falta MONGO_URI en .env");
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log("[mongo] conectado a", uri);
}

/* ============ CREATE ============ */
app.post("/api/ticketvvp", async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ ok: false, error: "Body vacío" });
    }
    const doc = await Ticket.create(req.body);
    return res.status(201).json({ ok: true, data: doc });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ ok: false, error: "ticketId ya existe" });
    }
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/* ============= READ ============= */
app.get("/api/ticketvvp", async (req, res) => {
  try {
    const { state, title, userId } = req.query;
    const limit = Number(req.query.limit ?? 50);
    const skip = Number(req.query.skip ?? 0);

    const filter = {};
    if (state) filter.state = state;
    if (title) filter.title = title;
    if (userId) filter.userId = userId;

    const docs = await Ticket.find(filter)
      .sort({ ticketTime: -1 })
      .skip(skip)
      .limit(limit);

    res.json({ ok: true, count: docs.length, data: docs });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/ticketvvp/:ticketId", async (req, res) => {
  try {
    const { ticketId } = req.params;
    const doc = await Ticket.findOne({ ticketId });
    if (!doc)
      return res.status(404).json({ ok: false, error: "No encontrado" });
    res.json({ ok: true, data: doc });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ============ UPDATE ============ */
app.patch("/api/ticketvvp/:ticketId", async (req, res) => {
  try {
    const { ticketId } = req.params;
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ ok: false, error: "Body vacío" });
    }

    const update = { $set: { ...req.body } };
    if (Object.prototype.hasOwnProperty.call(req.body, "state")) {
      if (req.body.state === "resuelto") {
        update.$set.resolucionTime = new Date();
      } else {
        update.$unset = { resolucionTime: "" };
      }
    }

    const doc = await Ticket.findOneAndUpdate({ ticketId }, update, {
      new: true,
      runValidators: true,
    });
    if (!doc)
      return res.status(404).json({ ok: false, error: "No encontrado" });
    res.json({ ok: true, data: doc });
  } catch (err) {
    if (err && err.code === 11000) {
      return res
        .status(409)
        .json({ ok: false, error: "Conflicto por clave única" });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ============ DELETE ============ */
app.delete("/api/ticketvvp/:ticketId", async (req, res) => {
  try {
    const { ticketId } = req.params;
    const doc = await Ticket.findOneAndDelete({ ticketId });
    if (!doc)
      return res.status(404).json({ ok: false, error: "No encontrado" });
    res.json({ ok: true, data: doc });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ========== Start ========== */
const PORT = Number(process.env.PORT || 3000);

connectDB()
  .then(() =>
    app.listen(PORT, () => console.log(`API en http://localhost:${PORT}`))
  )
  .catch((e) => {
    console.error("Error conectando a MongoDB:", e.message);
    process.exit(1);
  });

// ***********************************************************************************
// ***********************************************************************************
// ***********************************************************************************

// --- Activos API ---
const { Activo, Historico } = require("./db");

// helper: parseo simple de fecha (YYYY-MM-DD)
function parseDate(d) {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
}

// LISTAR con filtros
app.get("/api/activos", async (req, res) => {
  try {
    const {
      categoria,
      marca,
      usuario, // asignadoPara
      sinAsignar, // 'true' para sólo sin asignación
      fechaCompraDesde,
      fechaCompraHasta,
      fechaAsignacionDesde,
      fechaAsignacionHasta,
    } = req.query;

    const q = {};
    if (categoria) q.categoria = categoria;
    if (marca) q.marca = { $regex: marca, $options: "i" };
    if (usuario) q.asignadoPara = { $regex: usuario, $options: "i" };

    if (sinAsignar === "true") {
      q.$or = [{ asignadoPara: { $exists: false } }, { asignadoPara: "" }];
    }

    const fCompraD = parseDate(fechaCompraDesde);
    const fCompraH = parseDate(fechaCompraHasta);
    if (fCompraD || fCompraH) {
      q.fechaCompra = {};
      if (fCompraD) q.fechaCompra.$gte = fCompraD;
      if (fCompraH) q.fechaCompra.$lte = fCompraH;
    }

    const fAsigD = parseDate(fechaAsignacionDesde);
    const fAsigH = parseDate(fechaAsignacionHasta);
    if (fAsigD || fAsigH) {
      q.fechaAsignacion = {};
      if (fAsigD) q.fechaAsignacion.$gte = fAsigD;
      if (fAsigH) q.fechaAsignacion.$lte = fAsigH;
    }

    const items = await Activo.find(q).sort({ createdAt: -1 }).lean();
    res.json({ ok: true, data: items });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// CREAR activo (se puede sin asignación)
app.post("/api/activos", async (req, res) => {
  try {
    const body = req.body || {};
    const doc = await Activo.create(body);

    // crear documento histórico (uno por activo) con metadatos base
    await Historico.findOneAndUpdate(
      { activoId: doc._id },
      {
        $setOnInsert: {
          activoId: doc._id,
          categoria: doc.categoria,
          marca: doc.marca,
          modelo: doc.modelo,
          numeroSerie: doc.numeroSerie,
          asignadoPor: doc.asignadoPor || "",
          fechaCompra: doc.fechaCompra,
          asignadoPara: [],
          ultimaAsignacion: null,
        },
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ ok: true, data: doc });
  } catch (err) {
    const code = /duplicate key/i.test(err.message) ? 409 : 500;
    res.status(code).json({ ok: false, error: err.message });
  }
});

// LEER uno
app.get("/api/activos/:id", async (req, res) => {
  try {
    const doc = await Activo.findById(req.params.id).lean();
    if (!doc)
      return res.status(404).json({ ok: false, error: "No encontrado" });
    res.json({ ok: true, data: doc });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ACTUALIZAR (datos del activo)
app.patch("/api/activos/:id", async (req, res) => {
  try {
    const doc = await Activo.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!doc)
      return res.status(404).json({ ok: false, error: "No encontrado" });

    // mantener metadatos básicos sincronizados en histórico
    await Historico.findOneAndUpdate(
      { activoId: doc._id },
      {
        $set: {
          categoria: doc.categoria,
          marca: doc.marca,
          modelo: doc.modelo,
          numeroSerie: doc.numeroSerie,
          fechaCompra: doc.fechaCompra,
        },
      },
      { upsert: true }
    );

    res.json({ ok: true, data: doc });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ELIMINAR
app.delete("/api/activos/:id", async (req, res) => {
  try {
    const del = await Activo.findByIdAndDelete(req.params.id);
    if (!del)
      return res.status(404).json({ ok: false, error: "No encontrado" });
    // opcional: borrar histórico asociado
    await Historico.findOneAndDelete({ activoId: del._id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ASIGNAR / REASIGNAR (versión sin conflicto)
app.post("/api/activos/:id/asignar", async (req, res) => {
  try {
    const { asignadoPara, asignadoPor, fechaAsignacion } = req.body || {};
    if (!asignadoPara || !asignadoPor) {
      return res
        .status(400)
        .json({ ok: false, error: "Faltan campos: asignadoPara, asignadoPor" });
    }
    const fecha = fechaAsignacion ? new Date(fechaAsignacion) : new Date();

    const activo = await Activo.findByIdAndUpdate(
      req.params.id,
      { asignadoPara, asignadoPor, fechaAsignacion: fecha },
      { new: true, runValidators: true }
    );
    if (!activo)
      return res.status(404).json({ ok: false, error: "No encontrado" });

    await Historico.findOneAndUpdate(
      { activoId: activo._id },
      {
        $setOnInsert: { activoId: activo._id }, // <-- nada de asignadoPara aquí
        $set: {
          categoria: activo.categoria,
          marca: activo.marca,
          modelo: activo.modelo,
          numeroSerie: activo.numeroSerie,
          asignadoPor,
          fechaCompra: activo.fechaCompra,
          ultimaAsignacion: fecha,
        },
        $push: { asignadoPara: { nombre: asignadoPara, fecha } }, // <-- OK
      },
      { upsert: true, new: true }
    );

    res.json({ ok: true, data: activo });
  } catch (err) {
    console.error("Error en asignar:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// HISTÓRICO por activo
app.get("/api/activos/:id/historico", async (req, res) => {
  try {
    const h = await Historico.findOne({ activoId: req.params.id }).lean();
    if (!h) return res.json({ ok: true, data: { asignadoPara: [] } });
    res.json({ ok: true, data: h });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});
