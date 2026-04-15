// src/pages/Menu.tsx
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { isTicketAdmin } from "../auth/isTicketAdmin";
import { puedeRevisarAprobaciones } from "../utils/ticketApproval";
import logo from "../assets/vivipra.png";
import AppHeader from "../components/AppHeader";

export default function Menu() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const nombre =
    [user?.primerNombre, user?.primerApellido].filter((part) => part && part.trim())
      .join(" ") || user?.nombreUsuario || "Usuario";
  const showApprovalPanel = puedeRevisarAprobaciones(user || undefined);

  // Bloquear acceso completo a /menu para administradores
  useEffect(() => {
    if (isTicketAdmin(user || undefined)) {
      navigate("/admin", { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-white text-neutral-900 relative overflow-hidden flex items-center justify-center">
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
        <AppHeader
          title={`Bienvenido, ${nombre}`}
          subtitle="Selecciona una opción para continuar"
          showBackButton={false}
        />

        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <img
            src={logo}
            alt="Vivipra"
            className="h-20 w-auto rounded-xl ring-2 ring-white/10 shadow-lg"
          />
        </div>

        {/* Acciones */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Reportar incidencia */}
          <Link
            to="/tickets/nuevo"
            className="group rounded-2xl border border-neutral-200 bg-white/90 p-6 transition shadow-[0_10px_28px_rgba(15,23,42,0.08)] hover:border-orange-200 hover:bg-white"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Reportar incidencia</h2>
              <span className="rounded-full border border-orange-200 bg-orange-100 px-3 py-1 text-xs text-orange-700">
                Nuevo
              </span>
            </div>
            <p className="mt-3 text-sm text-neutral-600">
              Crea un ticket describiendo el problema para dar seguimiento.
            </p>
            <div className="mt-5">
              <button
                className="w-full rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white shadow-sm transition group-hover:bg-orange-500"
                type="button"
              >
                Comenzar
              </button>
            </div>
          </Link>

          {/* Revisar tickets */}
          <Link
            to="/tickets"
            className="group rounded-2xl border border-neutral-200 bg-white/90 p-6 transition shadow-[0_10px_28px_rgba(15,23,42,0.08)] hover:border-orange-200 hover:bg-white"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Revisar tickets</h2>
              <span className="rounded-full border border-orange-200 bg-orange-100 px-3 py-1 text-xs text-orange-700">
                Lista
              </span>
            </div>
            <p className="mt-3 text-sm text-neutral-600">
              Consulta el estado de tus tickets y filtra por prioridad.
            </p>
            <div className="mt-5">
              <button
                className="w-full rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white shadow-sm transition group-hover:bg-orange-500"
                type="button"
              >
                Ver tickets
              </button>
            </div>
          </Link>

          {showApprovalPanel && (
            <Link
              to="/tickets/aprobaciones"
              className="group rounded-2xl border border-neutral-200 bg-white/90 p-6 transition shadow-[0_10px_28px_rgba(15,23,42,0.08)] hover:border-fuchsia-200 hover:bg-white"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Revisar solicitudes</h2>
                <span className="rounded-full border border-fuchsia-200 bg-fuchsia-100 px-3 py-1 text-xs text-fuchsia-700">
                  Jefatura
                </span>
              </div>
              <p className="mt-3 text-sm text-neutral-600">
                Aprueba o rechaza tickets que requieren visto bueno antes de pasar a TI.
              </p>
              <div className="mt-5">
                <button
                  className="w-full rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white shadow-sm transition group-hover:bg-orange-500"
                  type="button"
                >
                  Revisar
                </button>
              </div>
            </Link>
          )}

          {showApprovalPanel && (
            <Link
              to="/tickets/equipo"
              className="group rounded-2xl border border-neutral-200 bg-white/90 p-6 transition shadow-[0_10px_28px_rgba(15,23,42,0.08)] hover:border-orange-200 hover:bg-white"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Tickets de mi equipo</h2>
                <span className="rounded-full border border-orange-200 bg-orange-100 px-3 py-1 text-xs text-orange-700">
                  Jefatura
                </span>
              </div>
              <p className="mt-3 text-sm text-neutral-600">
                Revisa los tickets creados por trabajadores de tus áreas.
              </p>
              <div className="mt-5">
                <button
                  className="w-full rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white shadow-sm transition group-hover:bg-orange-500"
                  type="button"
                >
                  Ver tickets
                </button>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

