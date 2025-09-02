import { useState } from "react";
import logo from "../assets/vivipra.png";
import { useNavigate } from "react-router-dom";
import { login as loginApi } from "../services/auth";
import { useAuth } from "../auth/AuthContext";
import { isTicketAdmin } from "../auth/isTicketAdmin";

export default function Login() {
  const [username, setUsername] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { login } = useAuth();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username || !pass) {
      setError("Completa usuario y contraseña.");
      return;
    }

    try {
      setLoading(true);
      const resp = await loginApi({ nombreUsuario: username, password: pass });
      login(resp.usuario);

      const dest = isTicketAdmin(resp.usuario) ? "/admin" : "/menu";
      navigate(dest, { replace: true });
    } catch (err: any) {
      setError(err?.message || "Credenciales inválidas.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 relative overflow-hidden">
      {/* gradiente decorativo */}
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

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4">
        {/* Lado izquierdo: branding */}
        <div className="hidden lg:flex lg:w-1/2 flex-col gap-6 pr-10">
          <div className="flex items-center gap-4">
            <img
              src={logo}
              alt="Vivipra"
              className="h-16 w-auto rounded-md ring-1 ring-white/10"
            />
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">
                Vivipra
              </h1>
              <p className="text-sm text-neutral-400">Sistema de Tickets VVP</p>
            </div>
          </div>
          <p className="text-neutral-300 leading-relaxed">
            Bienvenido. Inicia sesión para gestionar y crear tickets
            rápidamente.
          </p>
        </div>

        {/* Card de login */}
        <div className="w-full lg:w-1/2">
          <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
            <div className="mb-6 flex items-center gap-3">
              <img
                src={logo}
                alt="Vivipra"
                className="h-10 w-auto rounded ring-1 ring-white/10"
              />
              <h2 className="text-xl font-bold">Iniciar sesión</h2>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm text-neutral-300">
                  Usuario
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl bg-neutral-900/70 px-4 py-3 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                  placeholder="Nombre de usuario"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="pass" className="text-sm text-neutral-300">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="text-xs text-orange-400 hover:text-orange-300"
                  >
                    {showPass ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                <input
                  id="pass"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  className="w-full rounded-xl bg-neutral-900/70 px-4 py-3 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-orange-600 px-4 py-3 font-semibold transition hover:bg-orange-500 disabled:opacity-60"
              >
                {loading ? "Ingresando..." : "Ingresar"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
