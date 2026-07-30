import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { VendedorAuthProvider } from './context/VendedorAuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ProtectedRouteVendedor from './components/ProtectedRouteVendedor';
import Login from './pages/Login';
import AdminLayout from './pages/AdminLayout';
import ProfesionalLayout from './pages/ProfesionalLayout';
import Placeholder from './pages/Placeholder';
import Productos from './pages/admin/Productos';
import Campanas from './pages/admin/Campanas';
import PedidosHoy from './pages/admin/PedidosHoy';
import ConfiguracionAgenda from './pages/admin/ConfiguracionAgenda';
import InformacionNegocio from './pages/admin/InformacionNegocio';
import Clientes from './pages/admin/Clientes';
import LoginVendedor from './pages/vendedor/LoginVendedor';
import NuevaDemo from './pages/vendedor/NuevaDemo';
import MisDemos from './pages/vendedor/MisDemos';


function RaizSegunSesion() {
  const { usuario, cargandoSesion } = useAuth();
  if (cargandoSesion) return <div className="pantalla-carga">Cargando sesión…</div>;
  if (!usuario) return <Navigate to="/login" replace />;
  return <Navigate to={usuario.rol === 'PROFESIONAL' ? '/profesional' : '/admin'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RaizSegunSesion />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute rolesPermitidos={['ADMIN', 'RECEPCION']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Placeholder titulo="Dashboard" />} />
        <Route path="agenda" element={<Placeholder titulo="Agenda del día" />} />
        <Route path="configuracion-agenda" element={<ConfiguracionAgenda />} />
        <Route path="informacion-negocio" element={<InformacionNegocio />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="chats" element={<Placeholder titulo="Chats en vivo" />} />
        <Route path="lista-espera" element={<Placeholder titulo="Lista de espera" />} />
        <Route path="productos" element={<Productos />} />
        <Route path="campanas" element={<Campanas />} />
        <Route path="pedidos" element={<PedidosHoy />} />
      </Route>

      <Route
        path="/profesional"
        element={
          <ProtectedRoute rolesPermitidos={['PROFESIONAL']}>
            <ProfesionalLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Placeholder titulo="Mi agenda" />} />
        <Route path="disponibilidad" element={<Placeholder titulo="Mi disponibilidad" />} />
      </Route>

      {/* ------------------------------------------------------------
          Módulo de vendedores (demos comerciales). Autenticación y
          sesión completamente independientes del panel de negocios
          (ver VendedorAuthContext) — no comparten localStorage ni rol.
      ------------------------------------------------------------ */}
      <Route path="/vendedor/login" element={<LoginVendedor />} />
      <Route
        path="/vendedor/nueva-demo"
        element={
          <ProtectedRouteVendedor>
            <NuevaDemo />
          </ProtectedRouteVendedor>
        }
      />
      <Route
        path="/vendedor/mis-demos"
        element={
          <ProtectedRouteVendedor>
            <MisDemos />
          </ProtectedRouteVendedor>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <VendedorAuthProvider>
        <AppRoutes />
      </VendedorAuthProvider>
    </AuthProvider>
  );
}