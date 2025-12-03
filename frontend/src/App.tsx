import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import RequireAuth from "./routes/RequireAuth";
import NotificationContainer from "./components/NotificationContainer";
import { SSLCertificateCheck } from "./components/SSLCertificateCheck";

import Login from "./pages/Login";
import Menu from "./pages/Menu";
import NuevoTicket from "./pages/NuevoTicket";
import MisTickets from "./pages/MisTickets";
import Admin from "./pages/Admin";
import AdminHome from "./pages/AdminHome";
import GestionActivos from "./pages/GestionActivos"; // nueva ruta
import Modelos from "./pages/Modelos"; // especificaciones tecnicas
import AdminTicketsHistorico from "./pages/AdminTicketsHistorico";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <SSLCertificateCheck />
        <NotificationContainer />
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

          {/* gestion de activos */}
          <Route element={<RequireAuth />}>
            <Route
              path="/admin/gestion-activos"
              element={<GestionActivos />}
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
