// backend/server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const {
  Activo,
  Licencia,
  Historico,
  Ticket,
  EspecificacionModelo,
  SUCURSAL_OPTIONS,
} = require("./db");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, credentials: true } });

app.set("io", io);

io.on("connection", (socket) => {
  console.log(`[socket] conectado ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`[socket] desconectado ${socket.id}`);
  });
});

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
// Validaciones de creacion
function assertActivoCreate(b) {
  const req = ["categoria", "marca", "modelo", "numeroSerie", "fechaCompra"];
  const missing = req.filter((k) => b?.[k] == null || b[k] === "");
  if (missing.length) return `Faltan campos: ${missing.join(", ")}`;
  if (b?.sucursal && !SUCURSAL_OPTIONS.includes(b.sucursal)) {
    return `Sucursal invalida: ${b.sucursal}`;
  }
  return null;
}
function assertLicenciaCreate(b) {
  const req = ["proveedor", "tipoLicencia", "fechaCompra", "cuenta"];
  const missing = req.filter((k) => b?.[k] == null || b[k] === "");
  if (missing.length) return `Faltan campos: ${missing.join(", ")}`;
  if (b?.sucursal && !SUCURSAL_OPTIONS.includes(b.sucursal)) {
    return `Sucursal invalida: ${b.sucursal}`;
  }
  return null;
}

// Tipos de licencia válidos por proveedor
const TIPOS_LIC_POR_PROV = {
  SAP: [
    "Profesional",
    "CRM limitada",
    "Logistica limitada",
    "Acceso indirecto",
    "Financiera limitada",
  ],
  Office: [
    "Microsoft 365 E3",
    "Microsoft 365 Empresa Basico",
    "Microsoft 365 Empresa Estandar",
  ],
};

function assertCompatProveedorTipo({ proveedor, tipoLicencia }) {
  if (!proveedor || !tipoLicencia) return null;
  const lista = TIPOS_LIC_POR_PROV[proveedor];
  if (!lista) return `Proveedor desconocido: ${proveedor}`;
  if (!lista.includes(tipoLicencia)) {
    return `El tipo de licencia '${tipoLicencia}' no corresponde al proveedor '${proveedor}'.`;
  }
  return null;
}

// upsert + push movimiento
async function pushMovimiento({ tipo, refId, movimiento }) {
  // compat: aseguramos activoId = refId para no chocar con indices antiguos
  return Historico.updateOne(
    { tipo, refId },
    { $setOnInsert: { activoId: refId }, $push: { movimientos: movimiento } },
    { upsert: true }
  );
}

function emitTicketEvent(appRef, event, doc) {
  if (!doc || !appRef?.get) return;
  const io = appRef.get("io");
  if (!io) return;
  const plain = typeof doc.toObject === "function" ? doc.toObject({ versionKey: false }) : doc;

  const normalizeDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "string") return value;
    return new Date(value).toISOString();
  };

  io.emit(event, {
    ...plain,
    ticketTime: normalizeDate(plain.ticketTime),
    resolucionTime: normalizeDate(plain.resolucionTime),
    createdAt: normalizeDate(plain.createdAt),
    updatedAt: normalizeDate(plain.updatedAt),
  });
}



/* =========================
 * ACTIVOS
 * ========================= */

// Crear ACTIVO
app.post("/api/activos", async (req, res) => {
  try {
    const err = assertActivoCreate(req.body);
    if (err) return res.status(400).json({ ok: false, error: err });

    // Validar que el modelo exista en la colección de especificaciones técnicas
    if (req.body?.modelo) {
      const spec = await EspecificacionModelo.findOne({
        modelo: req.body.modelo,
      })
        .select({ _id: 1 })
        .lean();
      if (!spec) {
        return res.status(400).json({
          ok: false,
          error:
            "El modelo no está registrado en especificaciones técnicas. Crea primero la especificación del modelo.",
        });
      }
    }

    // Si existe especificación, tomar la marca del modelo (si se conoce)
    let payload = { ...req.body };
    if (req.body?.modelo) {
      const fullSpec = await EspecificacionModelo.findOne({
        modelo: req.body.modelo,
      })
        .select({ marca: 1, categoria: 1 })
        .lean();
      if (fullSpec) {
        // marca desde especificación (forzamos para mantener consistencia)
        payload.marca = fullSpec.marca || payload.marca;
        // opcional: alinear categoría si no viene
        if (!payload.categoria && fullSpec.categoria)
          payload.categoria = fullSpec.categoria;
      }
    }

    const doc = await Activo.create(payload);

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
    if (!doc)
      return res.status(404).json({ ok: false, error: "No encontrado" });
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
    if (req.query.sucursal) {
      const sucursal = String(req.query.sucursal);
      if (!SUCURSAL_OPTIONS.includes(sucursal)) {
        return res.status(400).json({ ok: false, error: "Sucursal invalida" });
      }
      q.sucursal = sucursal;
    }

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

    const limit = Math.min(Number(req.query.limit) || 50, 500);
    const skip = Math.max(Number(req.query.skip) || 0, 0);
    const [docs, total] = await Promise.all([
      Activo.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Activo.countDocuments(q),
    ]);
    res.json({ ok: true, data: docs, total, limit, skip });
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
    // Permitir crear una o muchas licencias (array)
    const payload = req.body;

    // Caso múltiple
    if (Array.isArray(payload)) {
      if (payload.length === 0) {
        return res.status(400).json({ ok: false, error: "Sin elementos" });
      }

      // Validar requeridos y compatibilidad proveedor-tipo por item
      const errores = payload
        .map((item, idx) => {
          const reqErr = assertLicenciaCreate(item);
          const compErr = reqErr ? null : assertCompatProveedorTipo(item);
          return { idx, err: reqErr || compErr };
        })
        .filter((x) => x.err);
      if (errores.length) {
        const first = errores[0];
        return res.status(400).json({
          ok: false,
          error: `Item ${first.idx}: ${first.err}`,
        });
      }

      // Reglas: evitar duplicados dentro del mismo lote (cuenta + tipoLicencia)
      const keys = payload.map(
        (i) => `${String(i.cuenta)}||${String(i.tipoLicencia)}`
      );
      const dupInBatch = keys.find((k, i) => keys.indexOf(k) !== i);
      if (dupInBatch) {
        return res.status(409).json({
          ok: false,
          error: "Duplicado en el lote: misma cuenta y tipoLicencia repetidos.",
        });
      }

      // Reglas: evitar duplicados ya existentes en BD
      const orConds = payload.map((i) => ({
        cuenta: i.cuenta,
        tipoLicencia: i.tipoLicencia,
      }));
      const existing = await Licencia.find({ $or: orConds })
        .select({ cuenta: 1, tipoLicencia: 1 })
        .lean();
      if (existing.length) {
        const found = existing[0];
        return res.status(409).json({
          ok: false,
          error: `Ya existe una licencia '${found.tipoLicencia}' para la cuenta '${found.cuenta}'.`,
        });
      }

      // Crear en bloque
      const created = await Licencia.insertMany(payload);

      // Registrar historial para las que vengan asignadas
      for (const [idx, doc] of created.entries()) {
        const src = payload[idx] || {};
        if (doc.asignadoPara) {
          await pushMovimiento({
            tipo: "licencia",
            refId: doc._id,
            movimiento: {
              usuario: doc.asignadoPara,
              accion: "asignado",
              fecha: doc.fechaAsignacion || new Date(),
              observacion: src._observacion || "",
              por: src._por || "",
              desde: "",
              hasta: doc.asignadoPara,
            },
          });
        }
      }

      return res.status(201).json({ ok: true, data: created });
    }

    // Caso único
    let err = assertLicenciaCreate(payload);
    if (!err) err = assertCompatProveedorTipo(payload);
    if (err) return res.status(400).json({ ok: false, error: err });

    // Regla de negocio: una cuenta no puede repetir el mismo tipo de licencia
    const dup = await Licencia.findOne({
      cuenta: payload.cuenta,
      tipoLicencia: payload.tipoLicencia,
    }).lean();
    if (dup) {
      return res.status(409).json({
        ok: false,
        error:
          "La cuenta ya tiene una licencia de este tipo. No se permiten duplicados.",
      });
    }

    const doc = await Licencia.create(payload);

    // Si viene asignadoPara al crear (opcional), registra historial
    if (doc.asignadoPara) {
      await pushMovimiento({
        tipo: "licencia",
        refId: doc._id,
        movimiento: {
          usuario: doc.asignadoPara,
          accion: "asignado",
          fecha: doc.fechaAsignacion || new Date(),
          observacion: payload._observacion || "",
          por: payload._por || "",
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

    // Si se cambian proveedor/tipo, validar compatibilidad
    const prov = req.body.proveedor || before.proveedor;
    const tipo = req.body.tipoLicencia || before.tipoLicencia;
    const errComp = assertCompatProveedorTipo({
      proveedor: prov,
      tipoLicencia: tipo,
    });
    if (errComp) return res.status(400).json({ ok: false, error: errComp });

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
    if (!doc)
      return res.status(404).json({ ok: false, error: "No encontrada" });
    res.json({ ok: true, data: doc });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Listar LICENCIAS (básico)
app.get("/api/licencias", async (req, res) => {
  try {
    const q = {};
    if (req.query.cuenta) {
      try {
        q.cuenta = new RegExp(String(req.query.cuenta), "i");
      } catch (_) {
        q.cuenta = String(req.query.cuenta);
      }
    }
    if (req.query.proveedor) q.proveedor = req.query.proveedor;
    if (req.query.tipoLicencia) q.tipoLicencia = req.query.tipoLicencia;
    if (req.query.sucursal) {
      const sucursal = String(req.query.sucursal);
      if (!SUCURSAL_OPTIONS.includes(sucursal)) {
        return res.status(400).json({ ok: false, error: "Sucursal invalida" });
      }
      q.sucursal = sucursal;
    }
    if (req.query.asignadoPara) {
      try {
        q.asignadoPara = new RegExp(String(req.query.asignadoPara), "i");
      } catch (_) {
        q.asignadoPara = String(req.query.asignadoPara);
      }
    }

    if (req.query.desdeCompra || req.query.hastaCompra) {
      q.fechaCompra = {};
      if (req.query.desdeCompra)
        q.fechaCompra.$gte = new Date(req.query.desdeCompra);
      if (req.query.hastaCompra)
        q.fechaCompra.$lte = new Date(req.query.hastaCompra);
    }

    const limit = Math.min(Number(req.query.limit) || 50, 500);
    const skip = Math.max(Number(req.query.skip) || 0, 0);
    const [docs, total] = await Promise.all([
      Licencia.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Licencia.countDocuments(q),
    ]);
    res.json({ ok: true, data: docs, total, limit, skip });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Estadisticas de LICENCIAS
app.get("/api/licencias/stats", async (_req, res) => {
  try {
    const [licDocs, activosLicDocs] = await Promise.all([
      Licencia.find({}, { proveedor: 1, tipoLicencia: 1, cuenta: 1 }).lean(),
      Activo.find({ categoria: "licencias" }, { licencia: 1 }).lean(),
    ]);

    const stats = {
      total: 0,
      disponibles: 0,
      porTipo: {},
      porProveedor: {},
    };

    const addSample = (tipo, proveedor, cuenta) => {
      const keyTipo = tipo || "Sin tipo";
      const keyProv = proveedor || "Sin proveedor";
      const cuentaStr = (cuenta == null ? "" : String(cuenta))
        .trim()
        .toLowerCase();
      const disponible = cuentaStr === "disponible";

      stats.total += 1;
      if (disponible) stats.disponibles += 1;
      stats.porTipo[keyTipo] = (stats.porTipo[keyTipo] || 0) + 1;
      stats.porProveedor[keyProv] = (stats.porProveedor[keyProv] || 0) + 1;
    };

    for (const lic of licDocs) {
      addSample(
        lic.tipoLicencia || "Sin tipo",
        lic.proveedor || "Sin proveedor",
        lic.cuenta
      );
    }

    for (const activo of activosLicDocs) {
      const lic = (activo && activo.licencia) || {};
      addSample(
        lic.tipoLicencia || "Sin tipo",
        lic.proveedor || "Sin proveedor",
        lic.cuenta
      );
    }

    const ocupadas = Math.max(stats.total - stats.disponibles, 0);

    res.json({
      ok: true,
      data: {
        total: stats.total,
        disponibles: stats.disponibles,
        ocupadas,
        porTipo: stats.porTipo,
        porProveedor: stats.porProveedor,
      },
    });
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
 * ESPECIFICACIONES (Modelos)
 * ========================= */
// Listar especificaciones de modelos
app.get("/api/especificaciones", async (_req, res) => {
  try {
    const docs = await EspecificacionModelo.find({})
      .sort({ modelo: 1 })
      .limit(1000)
      .lean();
    res.json({ ok: true, data: docs });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Crear especificación de modelo (modelo único)
app.post("/api/especificaciones", async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.modelo || String(b.modelo).trim() === "")
      return res
        .status(400)
        .json({ ok: false, error: "Falta campo requerido: modelo" });

    // Evitar duplicados por modelo
    const exists = await EspecificacionModelo.findOne({
      modelo: b.modelo,
    }).lean();
    if (exists)
      return res.status(409).json({
        ok: false,
        error: "Ya existe una especificación para ese modelo",
      });

    const doc = await EspecificacionModelo.create({
      modelo: b.modelo,
      categoria: b.categoria,
      marca: b.marca,
      procesador: b.procesador,
      frecuenciaGhz: b.frecuenciaGhz,
      almacenamiento: b.almacenamiento,
      ram: b.ram,
      so: b.so,
      graficos: b.graficos,
      resolucion: b.resolucion,
    });
    res.status(201).json({ ok: true, data: doc });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Editar especificación por id
app.patch("/api/especificaciones/:id", async (req, res) => {
  try {
    const set = {};
    for (const k of [
      "modelo",
      "categoria",
      "marca",
      "procesador",
      "frecuenciaGhz",
      "almacenamiento",
      "ram",
      "so",
      "graficos",
      "resolucion",
    ]) {
      if (req.body[k] !== undefined) set[k] = req.body[k];
    }
    const doc = await EspecificacionModelo.findByIdAndUpdate(
      req.params.id,
      { $set: set },
      { new: true, runValidators: true }
    );
    if (!doc)
      return res.status(404).json({ ok: false, error: "No encontrado" });
    res.json({ ok: true, data: doc });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Eliminar especificación por id
app.delete("/api/especificaciones/:id", async (req, res) => {
  try {
    const doc = await EspecificacionModelo.findByIdAndDelete(req.params.id);
    if (!doc)
      return res.status(404).json({ ok: false, error: "No encontrado" });
    res.json({ ok: true, data: doc });
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

    const firstName = typeof b.userName === "string" ? b.userName.trim() : "";
    const lastName = typeof b.userLastName === "string" ? b.userLastName.trim() : "";
    const providedFullName =
      typeof b.userFullName === "string" ? b.userFullName.trim() : "";
    const inferredFullName = [firstName, lastName].filter(Boolean).join(" ");

    const payload = {
      ticketId: b.ticketId,
      title: b.title,
      description: String(b.description || "").trim(),
      userId: b.userId,
      userName: firstName || b.userId,
      userLastName: lastName || undefined,
      userFullName: providedFullName || inferredFullName || undefined,
      risk: b.risk,
      state: b.state,
      images,
      ticketTime: b.ticketTime ? new Date(b.ticketTime) : new Date(),
    };
    const doc = await Ticket.create(payload);
    emitTicketEvent(req.app, "ticket:created", doc);
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

    const doc = await Ticket.findOneAndUpdate(
      { ticketId },
      { $set: set },
      {
        new: true,
        runValidators: true,
      }
    );
    if (!doc)
      return res.status(404).json({ ok: false, error: "No encontrado" });
    emitTicketEvent(req.app, "ticket:updated", doc);
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
app.get("/api/admin/tickets/metrics", async (_req, res) => {
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const since = new Date(now);
    since.setDate(now.getDate() - 29);

    const [resolutionStats] = await Ticket.aggregate([
      { $match: { resolucionTime: { $ne: null } } },
      {
        $project: {
          diff: {
            $subtract: [
              "$resolucionTime",
              { $ifNull: ["$ticketTime", "$createdAt"] },
            ],
          },
        },
      },
      { $match: { diff: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: "$diff" } } },
    ]);

    const perCategoryAgg = await Ticket.aggregate([
      {
        $group: {
          _id: "$title",
          total: { $sum: 1 },
        },
      },
      { $sort: { total: -1, _id: 1 } },
    ]);

    const perUserAgg = await Ticket.aggregate([
      {
        $group: {
          _id: { $ifNull: ["$userId", "desconocido"] },
          total: { $sum: 1 },
          userName: { $first: { $ifNull: ["$userName", ""] } },
          userLastName: { $first: { $ifNull: ["$userLastName", ""] } },
          userFullName: { $first: { $ifNull: ["$userFullName", ""] } },
        },
      },
      { $sort: { total: -1, _id: 1 } },
      { $limit: 50 },
    ]);

    const highRiskOpen = await Ticket.countDocuments({
      risk: "alto",
      state: { $ne: "resuelto" },
    });

    const createdAgg = await Ticket.aggregate([
      {
        $addFields: {
          createdDate: { $ifNull: ["$ticketTime", "$createdAt"] },
        },
      },
      { $match: { createdDate: { $gte: since } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdDate" },
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const resolvedAgg = await Ticket.aggregate([
      { $match: { resolucionTime: { $ne: null } } },
      { $match: { resolucionTime: { $gte: since } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$resolucionTime" },
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dayMs = 24 * 60 * 60 * 1000;
    const timeline = [];
    for (let offset = 0; offset < 30; offset += 1) {
      const day = new Date(since.getTime() + offset * dayMs);
      timeline.push(day.toISOString().slice(0, 10));
    }

    const createdMap = new Map(createdAgg.map((item) => [item._id, item.total]));
    const resolvedMap = new Map(
      resolvedAgg.map((item) => [item._id, item.total])
    );

    const trend = timeline.map((date) => ({
      date,
      created: createdMap.get(date) || 0,
      resolved: resolvedMap.get(date) || 0,
    }));

    const avgResolutionTimeHours =
      typeof resolutionStats?.avg === "number"
        ? Number((resolutionStats.avg / (1000 * 60 * 60)).toFixed(2))
        : null;

    res.json({
      ok: true,
      data: {
        avgResolutionTimeHours,
        ticketsByUser: perUserAgg.map((item) => {
          const isUnknown = item._id === "desconocido";
          const userId = isUnknown ? "" : item._id;
          const firstName =
            typeof item.userName === "string" ? item.userName.trim() : "";
          const lastName =
            typeof item.userLastName === "string" ? item.userLastName.trim() : "";
          const storedFullName =
            typeof item.userFullName === "string" ? item.userFullName.trim() : "";
          const computedFullName =
            storedFullName || [firstName, lastName].filter(Boolean).join(" ");
          const fallbackName = isUnknown ? "Sin usuario" : userId;

          return {
            userId,
            userName: firstName || fallbackName,
            userLastName: lastName || undefined,
            userFullName: computedFullName || undefined,
            total: item.total,
          };
        }),

        ticketsByCategory: perCategoryAgg.map((item) => ({
          category: item._id,
          total: item.total,
        })),
        highRiskOpen,
        trend,
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* =========================
 * Server
 * ========================= */
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`[server] listo en :${PORT}`));

