// src/pages/Menu.tsx
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { isContaAdmin } from "../auth/isContaAdmin";
import logo from "../assets/vivipra.png";
import AppHeader from "../components/AppHeader";

const AUTHORIZED_ADMINS = ["mcontreras", "ejimenez", "igonzalez"] as const;

export default function Menu() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const nombre =
    [user?.primerNombre, user?.primerApellido].filter((part) => part && part.trim())
      .join(" ") || user?.nombreUsuario || "Usuario";
  const showContaPanel = isContaAdmin(user || undefined);

  // Bloquear acceso completo a /menu para administradores
  useEffect(() => {
    const username = user?.nombreUsuario || user?.usuario;
    const isAdmin = AUTHORIZED_ADMINS.includes(username as any);
    if (isAdmin) {
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

          {showContaPanel && (
            <Link
              to="/admin/conta"
              className="group rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Panel Contabilidad</h2>
                <span className="rounded-full px-3 py-1 text-xs bg-orange-600/20 text-orange-300 border border-orange-600/30">
                  Admin
                </span>
              </div>
              <p className="mt-3 text-neutral-300 text-sm">
                Revisa tickets de usuarios con rol usrconta.
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
          )}
        </div>
      </div>
    </div>
  );
}

