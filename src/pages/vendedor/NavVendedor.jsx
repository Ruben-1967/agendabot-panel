import { NavLink } from 'react-router-dom';
import { useVendedorAuth } from '../../context/VendedorAuthContext';

export default function NavVendedor() {
  const { vendedor, cerrarSesionVendedor } = useVendedorAuth();
  const esAdmin = vendedor?.rol === 'ADMIN';

  return (
    <nav className="nav-vendedor">
      <NavLink to="/vendedor/mis-demos" className={({ isActive }) => isActive ? 'nav-vendedor-link activo' : 'nav-vendedor-link'}>
        Mis casos
      </NavLink>
      <NavLink to="/vendedor/nueva-demo" className={({ isActive }) => isActive ? 'nav-vendedor-link activo' : 'nav-vendedor-link'}>
        + Nueva demo
      </NavLink>
      <NavLink to="/vendedor/ranking" className={({ isActive }) => isActive ? 'nav-vendedor-link activo' : 'nav-vendedor-link'}>
        Ranking
      </NavLink>
      {esAdmin && (
        <>
          <NavLink to="/vendedor/admin/pool-leads" className={({ isActive }) => isActive ? 'nav-vendedor-link activo' : 'nav-vendedor-link'}>
            Pool de leads
          </NavLink>
          <NavLink to="/vendedor/admin/pagos" className={({ isActive }) => isActive ? 'nav-vendedor-link activo' : 'nav-vendedor-link'}>
            Pagos pendientes
          </NavLink>
          <NavLink to="/vendedor/admin/ranking" className={({ isActive }) => isActive ? 'nav-vendedor-link activo' : 'nav-vendedor-link'}>
            Config. ranking
          </NavLink>
          <NavLink to="/vendedor/admin/sla" className={({ isActive }) => isActive ? 'nav-vendedor-link activo' : 'nav-vendedor-link'}>
            Config. SLA
          </NavLink>
          <NavLink to="/vendedor/admin/vendedores" className={({ isActive }) => isActive ? 'nav-vendedor-link activo' : 'nav-vendedor-link'}>
            Vendedores
          </NavLink>
          <NavLink to="/vendedor/admin/catalogo-demo" className={({ isActive }) => isActive ? 'nav-vendedor-link activo' : 'nav-vendedor-link'}>
            Catálogo visual
          </NavLink>
        </>
      )}
      <button className="nav-vendedor-salir" onClick={cerrarSesionVendedor}>
        Cerrar sesión
      </button>
    </nav>
  );
}
