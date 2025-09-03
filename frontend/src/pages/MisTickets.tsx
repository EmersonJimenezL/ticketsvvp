// src/pages/MisTickets.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { listTickets, type Ticket } from "../services/tickets";

const ESTADOS: Ticket["state"][] = [
  "recibido",
  "enProceso",
  "resuelto",
  "conDificultades",
];
const TITULOS: Ticket["title"][] = [
  "SAP",
  "Impresoras",
  "Cuentas",
  "Rinde Gastos",
  "Terreno",
  "Otros",
];

export default function MisTickets() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // filtros
  const [estado, setEstado] = useState<"" | Ticket["state"]>("");
  const [titulo, setTitulo] = useState<"" | Ticket["title"]>("");
  // paginación simple
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(0);
  const skip = useMemo(() => page * limit, [page, limit]);

  const cargar = useCallback(async () => {
    if (!user?.nombreUsuario) {
      setError("Sesión no válida.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const resp = await listTickets({
        userId: user.nombreUsuario,
        state: estado || undefined,
        title: titulo || undefined,
        limit,
        skip,
      });
      if (!resp.ok) throw new Error(resp.error || "Error listando tickets");
      setItems(resp.data);
    } catch (e: any) {
      setError(e?.message || "No se pudo obtener tus tickets");
    } finally {
      setLoading(false);
    }
  }, [user?.nombreUsuario, estado, titulo, limit, skip]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Auto-refresh: foco de ventana, volver de background y polling ligero
  useEffect(() => {
    const onFocus = () => cargar();
    const onVisible = () => {
      if (!document.hidden) cargar();
    };
    const id = setInterval(() => cargar(), 10000); // 10s

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(id);
    };
  }, [cargar]);

  function colorEstado(s: Ticket["state"]) {
    switch (s) {
      case "recibido":
        return "bg-neutral-700 text-neutral-200";
      case "enProceso":
        return "bg-blue-600/20 text-blue-300 border-blue-600/40";
      case "resuelto":
        return "bg-emerald-600/20 text-emerald-300 border-emerald-600/40";
      case "conDificultades":
        return "bg-amber-600/20 text-amber-300 border-amber-600/40";
    }
  }
  function colorRiesgo(r: Ticket["risk"]) {
    switch (r) {
      case "alto":
        return "bg-red-600/20 text-red-300 border-red-600/40";
      case "medio":
        return "bg-amber-600/20 text-amber-300 border-amber-600/40";
      case "bajo":
        return "bg-emerald-600/20 text-emerald-300 border-emerald-600/40";
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 relative overflow-hidden px-4 py-10">
      {/* fondos */}
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

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Mis tickets
            </h1>
            <p className="text-neutral-300 text-sm">
              Tickets creados por {user?.primerNombre || user?.nombreUsuario}.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setPage(0);
                cargar();
              }}
              className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/10"
              type="button"
            >
              Actualizar
            </button>
            <button
              onClick={() => navigate("/menu")}
              className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/10"
              type="button"
            >
              Volver al menú
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            className="rounded-xl bg-neutral-900/70 px-4 py-3 ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
            value={estado}
            onChange={(e) => {
              setPage(0);
              setEstado(e.target.value as any);
            }}
          >
            <option value="">Estado: todos</option>
            {ESTADOS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl bg-neutral-900/70 px-4 py-3 ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
            value={titulo}
            onChange={(e) => {
              setPage(0);
              setTitulo(e.target.value as any);
            }}
          >
            <option value="">Área: todas</option>
            {TITULOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl bg-neutral-900/70 px-4 py-3 ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
            value={limit}
            onChange={(e) => {
              setPage(0);
              setLimit(Number(e.target.value));
            }}
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n} por página
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="flex-1 rounded-xl border border-white/10 px-4 py-3 hover:bg-white/10 disabled:opacity-50"
              type="button"
            >
              ◀
            </button>
            <span className="px-2 text-sm text-neutral-300">
              Página {page + 1}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              className="flex-1 rounded-xl border border-white/10 px-4 py-3 hover:bg-white/10"
              type="button"
            >
              ▶
            </button>
          </div>
        </div>

        {/* Lista */}
        <div className="space-y-3">
          {loading && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              Cargando...
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
              {error}
            </div>
          )}
          {!loading && !error && items.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-neutral-300">
              No hay tickets para los filtros seleccionados.
            </div>
          )}

          {items.map((t) => (
            <div
              key={t.ticketId}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-lg px-2 py-1 text-xs bg-orange-600/20 text-orange-300 border border-orange-600/30">
                    {t.title}
                  </span>
                  <span
                    className={`rounded-lg px-2 py-1 text-xs border ${colorEstado(
                      t.state
                    )}`}
                  >
                    {t.state}
                  </span>
                  <span
                    className={`rounded-lg px-2 py-1 text-xs border ${colorRiesgo(
                      t.risk
                    )}`}
                  >
                    {t.risk}
                  </span>
                </div>
                <div className="text-xs text-neutral-400">
                  {t.ticketTime ? new Date(t.ticketTime).toLocaleString() : ""}
                </div>
              </div>

              <div className="mt-3 text-neutral-200">
                <div className="font-semibold">{t.ticketId}</div>
                <p className="text-sm text-neutral-300 mt-1 whitespace-pre-line">
                  {t.description}
                </p>

                {/* comentario y fecha de resolución */}
                {t.comment && (
                  <p className="mt-3 text-sm text-neutral-200">
                    <span className="font-semibold">Comentario:</span>{" "}
                    <span className="text-neutral-300">{t.comment}</span>
                  </p>
                )}
                {t.resolucionTime && (
                  <p className="mt-1 text-xs text-neutral-400">
                    Resuelto: {new Date(t.resolucionTime).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
