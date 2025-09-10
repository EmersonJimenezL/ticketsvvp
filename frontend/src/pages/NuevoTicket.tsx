// src/pages/NuevoTicket.tsx
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { createTicket } from "../services/tickets";
import type { TicketPayload } from "../services/tickets";

// Generador simple de ticketId
function genTicketId() {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(
    d.getDate()
  )}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TCK-${stamp}-${rand}`;
}

const TITLES: TicketPayload["title"][] = [
  "SAP",
  "Impresoras",
  "Cuentas",
  "Rinde Gastos",
  "Terreno",
  "Otros",
];
const RISKS: TicketPayload["risk"][] = ["alto", "medio", "bajo"];

export default function NuevoTicket() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState<TicketPayload["title"] | null>(null);
  const [risk, setRisk] = useState<TicketPayload["risk"]>("bajo");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const submittingRef = useRef(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreatedId(null);
    // Evitar envíos múltiples por doble click o Enter repetido
    if (loading || submittingRef.current) return;

    if (!title || !description.trim()) {
      setError("Selecciona un área (title) y escribe una descripción.");
      return;
    }
    if (!user?.nombreUsuario) {
      setError("Sesión no válida. Vuelve a iniciar sesión.");
      return;
    }

    const ticketId = genTicketId();
    const payload: TicketPayload = {
      ticketId,
      title,
      description: description.trim(),
      userId: user.nombreUsuario,
      userName: user.primerNombre || user.nombreUsuario,
      risk,
      state: "recibido",
    };

    try {
      submittingRef.current = true;
      setLoading(true);
      const resp = await createTicket(payload);
      if (!resp.ok) throw new Error(resp.error || "Error al crear el ticket");
      setCreatedId(ticketId);
      // Redirigir a MisTickets tras crear exitosamente
      navigate("/tickets");
    } catch (err: any) {
      setError(err?.message || "No se pudo crear el ticket");
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 relative overflow-hidden flex items-center justify-center px-4">
      {/* Fondos decorativos */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div
          className="absolute -top-24 -left-24 h-80 w-80 rounded-full blur-3xl"
          style={{
            background: "radial-gradient(circle, #f97316 0%, transparent 60%)",
          }}
        />
        <div
          className="absolute bottom-0 right-0 h-96 w-96 rounded-full blur-3xl"
          style={{
            background: "radial-gradient(circle, #ea580c 0%, transparent 65%)",
          }}
        />
      </div>

      <div className="relative w-full max-w-2xl">
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
          <h1 className="text-2xl font-extrabold tracking-tight">
            Crear ticket
          </h1>
          <p className="text-neutral-300 text-sm">
            Completa el formulario y guarda tu incidencia.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.5)] space-y-5"
        >
          {/* Categoría */}
          <div className="space-y-2 text-center">
            <label className="text-lg text-neutral-300 mb-44">
              <strong>Categoría</strong>
            </label>
            <select
              className="w-full rounded-xl mt-5 bg-neutral-900/70 px-4 py-3 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
              value={title ?? ""}
              onChange={(e) =>
                setTitle(e.target.value as TicketPayload["title"])
              }
            >
              <option value="" disabled>
                Seleccione una categoría
              </option>
              {TITLES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Descripción */}
          <div className="space-y-2 text-center">
            <label className="text-lg text-neutral-300">
              <strong>Descripción</strong>
            </label>
            <textarea
              rows={5}
              className="w-full rounded-xl mt-5 bg-neutral-900/70 px-4 py-3 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe el problema o solicitud con el mayor detalle posible."
            />
          </div>

          {/* Riesgo */}
          <div className="space-y-2">
            <label className="text-sm text-neutral-300">Riesgo</label>
            <div className="grid grid-cols-3 gap-3">
              {RISKS.map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRisk(r)}
                  className={[
                    "rounded-xl px-4 py-2 ring-1 ring-white/10 bg-neutral-900/70 hover:bg-white/10 transition",
                    risk === r ? "outline-2 outline-orange-500" : "",
                  ].join(" ")}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Mensajes */}
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}
          {createdId && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              Ticket creado: <span className="font-semibold">{createdId}</span>
            </div>
          )}

          {/* Acciones */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-orange-600 px-5 py-3 font-semibold transition hover:bg-orange-500 disabled:opacity-60"
            >
              {loading ? "Guardando..." : "Guardar ticket"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/menu")}
              className="rounded-xl border border-white/10 px-5 py-3 hover:bg-white/10 transition"
            >
              Volver al menú
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
