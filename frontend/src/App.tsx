import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import RequireAuth from "./routes/RequireAuth";
import RouteLoader from "./components/RouteLoader";

import Login from "./pages/Login";
import RequireContaAdmin from "./routes/RequireContaAdmin";

const Menu = lazy(() => import("./pages/Menu"));
const NuevoTicket = lazy(() => import("./pages/NuevoTicket"));
const MisTickets = lazy(() => import("./pages/MisTickets"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminHome = lazy(() => import("./pages/AdminHome"));
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

            {/* admin */}
            <Route element={<RequireAuth />}>
              <Route path="/admin" element={<AdminHome />} />
              <Route path="/admin/tickets" element={<Admin />} />
              <Route
                path="/admin/tickets/historico"
                element={<AdminTicketsHistorico />}
              />
              <Route path="/admin/modelos" element={<Modelos />} />
            </Route>

            {/* admin contabilidad */}
            <Route element={<RequireAuth />}>
              <Route element={<RequireContaAdmin />}>
                <Route path="/admin/conta" element={<AdminConta />} />
              </Route>
            </Route>

            {/* gestion de activos */}
            <Route element={<RequireAuth />}>
              <Route
                path="/admin/gestion-activos"
                element={<GestionActivos />}
              />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
