// src/pages/Menu.tsx
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import logo from "../assets/vivipra.png";

export default function Menu() {
  const { user, logout } = useAuth();
  const nombre = user?.primerNombre || user?.nombreUsuario || "Usuario";

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 relative overflow-hidden flex items-center justify-center">
      {/* Gradientes decorativos */}
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

      <div className="relative w-full max-w-3xl px-4">
        {/* Banner superior */}
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-4">
            <img
              src={logo}
              alt="Vivipra"
              className="h-12 w-auto rounded ring-1 ring-white/10"
            />
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Bienvenido, <span className="text-orange-400">{nombre}</span>
              </h1>
              <p className="text-neutral-300 text-sm">
                Selecciona una opción para continuar.
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="ml-4 rounded-xl border border-white/10 px-3 py-2 text-sm text-neutral-200 hover:bg-white/10 transition"
            type="button"
          >
            Cerrar sesión
          </button>
        </div>

        {/* Acciones */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Reportar incidencia */}
          <Link
            to="/tickets/nuevo"
            className="group rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Reportar incidencia</h2>
              <span className="rounded-full px-3 py-1 text-xs bg-orange-600/20 text-orange-300 border border-orange-600/30">
                Nuevo
              </span>
            </div>
            <p className="mt-3 text-neutral-300 text-sm">
              Crea un ticket describiendo el problema para dar seguimiento.
            </p>
            <div className="mt-5">
              <button
                className="w-full rounded-xl bg-orange-600 px-4 py-3 font-semibold transition group-hover:bg-orange-500"
                type="button"
              >
                Comenzar
              </button>
            </div>
          </Link>

          {/* Revisar tickets */}
          <Link
            to="/tickets"
            className="group rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Revisar tickets</h2>
              <span className="rounded-full px-3 py-1 text-xs bg-orange-600/20 text-orange-300 border border-orange-600/30">
                Lista
              </span>
            </div>
            <p className="mt-3 text-neutral-300 text-sm">
              Consulta el estado de tus tickets y filtra por prioridad.
            </p>
            <div className="mt-5">
              <button
                className="w-full rounded-xl bg-orange-600 px-4 py-3 font-semibold transition group-hover:bg-orange-500"
                type="button"
              >
                Ver tickets
              </button>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
