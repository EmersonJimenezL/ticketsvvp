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
