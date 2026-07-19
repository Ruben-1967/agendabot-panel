import { Navigate } from 'react-router-dom';
import { useVendedorAuth } from '../context/VendedorAuthContext';

export default function ProtectedRouteVendedor({ children }) {
  const { vendedor, cargandoSesion } = useVendedorAuth();

  if (cargandoSesion) {
    return <div className="pantalla-carga">Cargando sesión…</div>;
  }

  if (!vendedor) {
    return <Navigate to="/vendedor/login" replace />;
  }

  return children;
}