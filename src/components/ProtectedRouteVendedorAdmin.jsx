import { Navigate } from 'react-router-dom';
import { useVendedorAuth } from '../context/VendedorAuthContext';

// Igual que ProtectedRouteVendedor, pero además exige rolVendedor ADMIN
// (jerarquía Vendedor/Supervisor/Admin del panel de vendedores — distinta
// del RolUsuario del panel de la empresa cliente).
export default function ProtectedRouteVendedorAdmin({ children }) {
  const { vendedor, cargandoSesion } = useVendedorAuth();

  if (cargandoSesion) {
    return <div className="pantalla-carga">Cargando sesión…</div>;
  }

  if (!vendedor) {
    return <Navigate to="/vendedor/login" replace />;
  }

  if (vendedor.rol !== 'ADMIN') {
    return <Navigate to="/vendedor/mis-demos" replace />;
  }

  return children;
}
