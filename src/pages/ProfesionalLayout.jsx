import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProfesionalLayout() {
  const { usuario, cerrarSesion } = useAuth();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          Agenda<span className="accent">Bot</span>
        </div>
        <nav>
          <NavLink to="/profesional" end>Mi agenda</NavLink>
          <NavLink to="/profesional/disponibilidad">Mi disponibilidad</NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="usuario-info">
            <strong>{usuario?.nombre}</strong>
            <span>{usuario?.recursoAgendableNombre || usuario?.empresaNombre}</span>
          </div>
          <button className="btn-salir" onClick={cerrarSesion}>Cerrar sesión</button>
        </div>
      </aside>
      <main className="contenido">
        <Outlet />
      </main>
    </div>
  );
}
