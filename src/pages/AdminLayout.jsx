import { useEffect, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchEstadoSuscripcion, fetchConversacionesPendientesCount } from '../api/client';

const MS_ENTRE_CONSULTAS_PENDIENTES = 30_000;

export default function AdminLayout() {
  const { usuario, token, cerrarSesion } = useAuth();
  const esCatalogoRotativo = usuario?.empresaModoOperacion === 'CATALOGO_ROTATIVO';
  const ocultarConfiguracionAgenda = usuario?.plan === 'PLAN_B' || usuario?.plan === 'PLAN_C';

  // null = sin aviso (o todavía dentro de las primeras 12h desde que activó
  // la cuenta) — 'verde'/'amarillo'/'rojo' según cuántos días lleva sin pagar.
  const [avisoPagoNivel, setAvisoPagoNivel] = useState(null);
  // A diferencia del banner, el botón del menú no espera las 12h — aparece
  // apenas la Suscripcion queda en PENDIENTE_PAGO y desaparece al pagar.
  const [pendientePago, setPendientePago] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchEstadoSuscripcion(token)
      .then((data) => {
        setAvisoPagoNivel(data.avisoPagoNivel);
        setPendientePago(data.estado === 'PENDIENTE_PAGO');
      })
      .catch(() => {}); // si falla la consulta, simplemente no se muestra el banner/botón
  }, [token]);

  // Conversaciones pausadas esperando intervención humana (bot en pausa
  // porque el cliente pidió hablar con alguien, o un humano ya intervino) —
  // se sondea cada 30s mientras el panel está abierto, no solo al montar,
  // para que el aviso desaparezca solo cuando se resuelva.
  const [conversacionesPendientes, setConversacionesPendientes] = useState(0);
  useEffect(() => {
    if (!token || !usuario?.empresaId) return;
    let cancelado = false;
    const consultar = () => {
      fetchConversacionesPendientesCount(token, usuario.empresaId)
        .then((data) => { if (!cancelado) setConversacionesPendientes(data.pendientes || 0); })
        .catch(() => {}); // si falla, simplemente no se actualiza el badge esta vuelta
    };
    consultar();
    const intervalo = setInterval(consultar, MS_ENTRE_CONSULTAS_PENDIENTES);
    return () => { cancelado = true; clearInterval(intervalo); };
  }, [token, usuario?.empresaId]);

  const TEXTO_AVISO = {
    verde: 'Tu suscripción está pendiente de pago — el acceso sigue habilitado, pero para no perder el servicio activa tu plan cuanto antes.',
    amarillo: 'Tu suscripción sigue pendiente de pago. Actívala pronto para no perder el acceso al sistema.',
    rojo: 'Tu suscripción lleva varios días pendiente de pago — activa tu plan ahora para no perder el acceso al sistema.',
  };

  return (
    <div className={avisoPagoNivel ? 'layout layout-con-banner' : 'layout'}>
      {avisoPagoNivel && (
        <div className={`banner-pago-pendiente banner-pago-${avisoPagoNivel}`}>
          {TEXTO_AVISO[avisoPagoNivel]}
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
              <NavLink to="/admin/tabla-citas">Tabla de citas</NavLink>
              <NavLink to="/admin/informacion-negocio">Información del negocio</NavLink>
              {!ocultarConfiguracionAgenda && (
                <NavLink to="/admin/configuracion-agenda">Configuración de agenda</NavLink>
              )}
              <NavLink to="/admin/clientes">Pacientes / Clientes</NavLink>
              <NavLink to="/admin/profesionales">Profesionales</NavLink>
              {/* <NavLink to="/admin/campanas">Campañas</NavLink> */}
              <NavLink to="/admin/chats" className="nav-item-con-badge">
                Chats en vivo
                {conversacionesPendientes > 0 && (
                  <span className="badge-alerta" title="Esperando intervención humana">{conversacionesPendientes}</span>
                )}
              </NavLink>
              <NavLink to="/admin/catalogo-visual">Catálogo visual</NavLink>
            </>
          )}
          {!usuario?.whatsappConectado && (
            <NavLink to="/admin/conectar-whatsapp">Conectar WhatsApp</NavLink>
          )}
          {pendientePago && (
            <NavLink to="/suscripcion/elegir-plan" className="nav-suscribir-plan">Suscribir plan</NavLink>
          )}
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