import { useEffect, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchEstadoSuscripcion } from '../api/client';

export default function AdminLayout() {
  const { usuario, token, cerrarSesion } = useAuth();
  const esCatalogoRotativo = usuario?.empresaModoOperacion === 'CATALOGO_ROTATIVO';
  const ocultarConfiguracionAgenda = usuario?.plan === 'PLAN_B' || usuario?.plan === 'PLAN_C';

  const [pendientePago, setPendientePago] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchEstadoSuscripcion(token)
      .then((data) => setPendientePago(data.estado === 'PENDIENTE_PAGO'))
      .catch(() => {}); // si falla la consulta, simplemente no se muestra el banner
  }, [token]);

  return (
    <div className={pendientePago ? 'layout layout-con-banner' : 'layout'}>
      {pendientePago && (
        <div className="banner-pago-pendiente">
          Tu suscripción está pendiente de pago — el acceso sigue habilitado, pero para no perder el servicio activa tu plan cuanto antes.
          <a href="/suscripcion/elegir-plan">Activar plan →</a>
        </div>
      )}
      <aside className="sidebar">
        <div className="sidebar-brand">
          Agenda<span className="accent">Bot</span>
        </div>
        <nav>
          <NavLink to="/admin" end>Dashboard</NavLink>
          {esCatalogoRotativo ? (
            <>
              <NavLink to="/admin/pedidos">Pedidos de hoy</NavLink>
              <NavLink to="/admin/campanas">Campañas</NavLink>
              <NavLink to="/admin/productos">Productos</NavLink>
            </>
          ) : (
            <>
              <NavLink to="/admin/agenda">Agenda del día</NavLink>
              <NavLink to="/admin/informacion-negocio">Información del negocio</NavLink>
              {!ocultarConfiguracionAgenda && (
                <NavLink to="/admin/configuracion-agenda">Configuración de agenda</NavLink>
              )}
              <NavLink to="/admin/clientes">Pacientes / Clientes</NavLink>
              <NavLink to="/admin/profesionales">Profesionales</NavLink>
              {/* <NavLink to="/admin/campanas">Campañas</NavLink> */}
              {/* <NavLink to="/admin/chats">Chats en vivo</NavLink> */}
              <NavLink to="/admin/lista-espera">Lista de espera</NavLink>
            </>
          )}
          <NavLink to="/admin/conectar-whatsapp">Conectar WhatsApp</NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="usuario-info">
            <strong>{usuario?.nombre}</strong>
            <span>{usuario?.empresaNombre}</span>
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