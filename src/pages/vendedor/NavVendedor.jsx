import { NavLink } from 'react-router-dom';
import { useVendedorAuth } from '../../context/VendedorAuthContext';

export default function NavVendedor() {
  const { vendedor, cerrarSesionVendedor } = useVendedorAuth();
  const esAdmin = vendedor?.rol === 'ADMIN';

  return (
    <nav className="nav-vendedor">
      <NavLink to="/vendedor/mis-demos" className={({ isActive }) => isActive ? 'nav-vendedor-link activo' : 'nav-vendedor-link'}>
        Casos
      </NavLink>
      <NavLink to="/vendedor/nueva-demo" className={({ isActive }) => isActive ? 'nav-vendedor-link activo' : 'nav-vendedor-link'}>
        + Nueva demo
      </NavLink>
      <NavLink to="/vendedor/ranking" className={({ isActive }) => isActive ? 'nav-vendedor-link activo' : 'nav-vendedor-link'}>
        Ranking
      </NavLink>
      <NavLink to="/vendedor/reporte-origen-caso" className={({ isActive }) => isActive ? 'nav-vendedor-link activo' : 'nav-vendedor-link'}>
        Heredado / orgánico
      </NavLink>
      {esAdmin && (
        <>
          <div className="nav-vendedor-separador" />
          <NavLink to="/vendedor/admin/leads" className={({ isActive }) => isActive ? 'nav-vendedor-link activo' : 'nav-vendedor-link'}>
            Leads
          </NavLink>
          <NavLink to="/vendedor/admin/clientes" className={({ isActive }) => isActive ? 'nav-vendedor-link activo' : 'nav-vendedor-link'}>
            Clientes
          </NavLink>
          <NavLink to="/vendedor/admin/excedente-citas" className={({ isActive }) => isActive ? 'nav-vendedor-link activo' : 'nav-vendedor-link'}>
            Excedente citas
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
