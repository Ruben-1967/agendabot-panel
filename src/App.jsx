import React, { useState, useEffect } from 'react';
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
import Dashboard from './pages/admin/Dashboard';
import Clientes from './pages/admin/Clientes';
import AgendaDia from './pages/admin/AgendaDia';
import ListaEspera from './pages/admin/ListaEspera';
import LoginVendedor from './pages/vendedor/LoginVendedor';
import NuevaDemo from './pages/vendedor/NuevaDemo';
import MisDemos from './pages/vendedor/MisDemos';
import ConvertirAClienteReal from './pages/ConvertirAClienteReal';
import ElegirPlan from './pages/ElegirPlan';

function RaizSegunSesion() {
  const { usuario, cargandoSesion } = useAuth();
  const { vendedor, cargandoSesionVendedor } = useAuth();

  if (cargandoSesion || cargandoSesionVendedor) {
    return <div className="pantalla-carga">Cargando...</div>;
  }

  if (usuario) return <Navigate to="/admin" replace />;
  if (vendedor) return <Navigate to="/vendedor/mis-demos" replace />;
  return <Navigate to="/login" replace />;
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
        <Route index element={<Dashboard />} />
        <Route path="agenda" element={<AgendaDia />} />
        <Route path="configuracion-agenda" element={<ConfiguracionAgenda />} />
        <Route path="informacion-negocio" element={<InformacionNegocio />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="lista-espera" element={<ListaEspera />} />
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

      <Route path="/convertir-a-cliente-real" element={<ConvertirAClienteReal />} />
      <Route path="/suscripcion/elegir-plan" element={<ElegirPlan />} />

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