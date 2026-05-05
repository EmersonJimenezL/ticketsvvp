import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import RequireAuth from "./routes/RequireAuth";
import RequireAdminTickets from "./routes/RequireAdminTickets";
import RouteLoader from "./components/RouteLoader";

import Login from "./pages/Login";

const Menu = lazy(() => import("./pages/Menu"));
const NuevoTicket = lazy(() => import("./pages/NuevoTicket"));
const MisTickets = lazy(() => import("./pages/MisTickets"));
const TicketAprobaciones = lazy(() => import("./pages/TicketAprobaciones"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminHome = lazy(() => import("./pages/AdminHome"));
const AdminUsuarios = lazy(() => import("./pages/AdminUsuarios"));
const GestionActivos = lazy(() => import("./pages/GestionActivos"));
const Modelos = lazy(() => import("./pages/Modelos"));
const AdminTicketsHistorico = lazy(() => import("./pages/AdminTicketsHistorico"));
const AdminConta = lazy(() => import("./pages/AdminConta"));

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* protegidas */}
            <Route element={<RequireAuth />}>
              <Route path="/menu" element={<Menu />} />
            </Route>

            {/* fallback */}
            <Route path="*" element={<Login />} />

            {/* crear tickets */}
            <Route element={<RequireAuth />}>
              <Route path="/tickets/nuevo" element={<NuevoTicket />} />
            </Route>

            {/* mis tickets */}
            <Route element={<RequireAuth />}>
              <Route path="/tickets" element={<MisTickets />} />
            </Route>

            {/* tickets de mi equipo */}
            <Route element={<RequireAuth />}>
              <Route path="/tickets/equipo" element={<AdminConta />} />
            </Route>

            {/* aprobaciones de jefatura */}
            <Route element={<RequireAuth />}>
              <Route
                path="/tickets/aprobaciones"
                element={<TicketAprobaciones />}
              />
            </Route>

            {/* admin */}
            <Route element={<RequireAuth />}>
              <Route element={<RequireAdminTickets />}>
                <Route path="/admin" element={<AdminHome />} />
                <Route path="/admin/tickets" element={<Admin />} />
                <Route
                  path="/admin/tickets/historico"
                  element={<AdminTicketsHistorico />}
                />
                <Route path="/admin/modelos" element={<Modelos />} />
                <Route path="/admin/usuarios" element={<AdminUsuarios />} />
              </Route>
            </Route>

            {/* compatibilidad ruta anterior */}
            <Route element={<RequireAuth />}>
              <Route path="/admin/conta" element={<AdminConta />} />
            </Route>

            {/* gestion de activos */}
            <Route element={<RequireAuth />}>
              <Route element={<RequireAdminTickets />}>
                <Route
                  path="/admin/gestion-activos"
                  element={<GestionActivos />}
                />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
