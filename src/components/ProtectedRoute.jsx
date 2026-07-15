import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Envuelve una ruta y exige sesión iniciada.
 * Si se pasa `rolesPermitidos`, además exige que el rol del usuario esté incluido.
 */
export default function ProtectedRoute({ children, rolesPermitidos }) {
  const { usuario, cargandoSesion } = useAuth();

  if (cargandoSesion) {
    return <div className="pantalla-carga">Cargando sesión…</div>;
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
    // Usuario autenticado pero sin permiso para esta sección:
    // lo mandamos a su propio panel según su rol.
    const destino = usuario.rol === 'PROFESIONAL' ? '/profesional' : '/admin';
    return <Navigate to={destino} replace />;
  }

  return children;
}
