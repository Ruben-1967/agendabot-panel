import React, { useState, useEffect } from 'react';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { useAuth } from '../../context/AuthContext';
import CalendarPickerModal from '../../components/CalendarPickerModal';
import { API_URL } from '../../api/client';
import './AgendaDia.css';

export default function AgendaDia() {
  const { usuario, token } = useAuth();
  const [citas, setCitas] = useState([]);
  const [filtro, setFiltro] = useState('todas');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [citaSeleccionada, setCitaSeleccionada] = useState(null);
  const [accionando, setAccionando] = useState(false);
  const [avisoWhatsApp, setAvisoWhatsApp] = useState(null); // { telefono, nombre, servicio, hora } de la �ltima cita cancelada
  
  // Estados para CalendarPickerModal (reagendamiento)
  const [modalAbierto, setModalAbierto] = useState(false);
  const [citaAReagendar, setCitaAReagendar] = useState(null);

  useEffect(() => {
    if (token) cargarAgenda();
  }, [token]);

const cargarAgenda = async () => {
    await cargarAgendaYDevolver();
  };

  const cargarAgendaYDevolver = async () => {
    try {
      setLoading(true);
      setError(null);
      const empresaId = usuario?.empresaId;
      if (!empresaId) {
        throw new Error('No hay empresaId en la sesión');
      }

      const res = await fetch(
        `${API_URL}/agenda/dashboard/${empresaId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        throw new Error(`Error ${res.status}: No se pudo cargar la agenda`);
      }

      const data = await res.json();
      setCitas(data.agendaHoy || []);
      return data;
    } catch (err) {
      console.error('Error cargando agenda:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Filtrar citas por estado
 const citasFiltradas = citas.filter((c) => {
    if (filtro === 'todas') return true;
    
    const estadoMap = {
      'confirmadas': 'CONFIRMADA',
      'pendientes': 'PENDIENTE',
      'completadas': 'COMPLETADA',
      'canceladas': 'CANCELADA',
    };
    
    return c.estado === estadoMap[filtro];
  });

  // Contar por estado
  const contadores = {
    todas: citas.length,
    confirmadas: citas.filter(c => c.estado === 'CONFIRMADA').length,
    pendientes: citas.filter(c => c.estado === 'PENDIENTE').length,
    completadas: citas.filter(c => c.estado === 'COMPLETADA').length,
    canceladas: citas.filter(c => c.estado === 'CANCELADA').length,
  };

 // Construye el link wa.me con el mensaje pre-cargado (editable por el
  // staff antes de enviar � no requiere plantilla aprobada de Meta porque
  // el env�o lo hace una persona, no la API).
  function construirLinkWhatsApp({ telefono, nombre, servicio, hora }) {
    if (!telefono) return null;
    const numero = parsePhoneNumberFromString(telefono, 'CL');
    if (!numero || !numero.isValid()) return null;

    const mensaje = `Hola ${nombre || ''}, te escribimos de ${usuario?.empresaNombre || 'nuestro negocio'}. Lamentablemente debemos cancelar tu cita${servicio ? ` de ${servicio}` : ''} agendada para hoy a las ${hora}. [agrega aqu� el motivo antes de enviar] �Te gustar�a reagendar para otro d�a?`;

    const numeroSinMas = numero.number.replace('+', '');
    return `https://wa.me/${numeroSinMas}?text=${encodeURIComponent(mensaje)}`;
  }

  // Cambiar estado de cita
  const cambiarEstado = async (nuevoEstado, mantenerSeleccion = false) => {
    if (!citaSeleccionada) return;

    setAccionando(true);
    try {
      const res = await fetch(
        `${API_URL}/agenda/citas/${citaSeleccionada.id}/estado`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ estado: nuevoEstado }),
        }
      );

      if (!res.ok) throw new Error('Error actualizando estado');

  if (nuevoEstado === 'CANCELADA') {
        setAvisoWhatsApp({
          telefono: citaSeleccionada.telefono,
          nombre: citaSeleccionada.nombre,
          servicio: citaSeleccionada.servicio,
          hora: citaSeleccionada.hora,
        });
      }

      const citaIdActual = citaSeleccionada.id;
      const data = await cargarAgendaYDevolver();
      if (!mantenerSeleccion) {
        setCitaSeleccionada(null);
      } else {
        const actualizada = (data?.agendaHoy || []).find((c) => c.id === citaIdActual);
        setCitaSeleccionada(actualizada || null);
      }

    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setAccionando(false);
    }
  };

  // Confirmar cita
  const handleConfirmar = async () => {
    await cambiarEstado('CONFIRMADA');
  };

  // Completar cita (marcar como asistió)
  const handleCompletar = async () => {
    await cambiarEstado('COMPLETADA');
  };

// Cancelar cita � mantiene el panel abierto para mostrar el aviso de WhatsApp
  const handleCancelar = async () => {
    if (!window.confirm('¿Confirmas que deseas cancelar esta cita?')) return;
    await cambiarEstado('CANCELADA', true);
  };

  // Marcar como no asistió
  const handleNoAsistio = async () => {
    if (!window.confirm('¿Marcar como no asistió?')) return;
    await cambiarEstado('NO_ASISTIO');
  };

  // Abrir modal de reagendamiento
  const handleReagendar = () => {
    if (!citaSeleccionada) return;
    setCitaAReagendar(citaSeleccionada);
    setModalAbierto(true);
  };

  // Confirmar reagendamiento desde modal
  const handleConfirmarReagendamiento = async (selection) => {
    if (!citaAReagendar) return;
    
    setAccionando(true);
    try {
      const res = await fetch(
        `${API_URL}/agenda/citas/${citaAReagendar.id}/reagendar`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            nuevaFecha: selection.fecha,
            nuevaHora: selection.hora,
            profesionalId: selection.profesionalId || null,
          }),
        }
      );
      
      if (!res.ok) throw new Error('Error reagendando cita');
      
      await cargarAgenda();
      setCitaSeleccionada(null);
      setCitaAReagendar(null);
      setModalAbierto(false);
      alert('Cita reagendada correctamente');
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setAccionando(false);
    }
  };

  // Obtener fecha de hoy formateada
  const obtenerFecha = () => {
    const hoy = new Date();
    const diasSemana = ['domingo', 'lunes', 'martes', 'mi�rcoles', 'jueves', 'viernes', 's�bado'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const diaSemana = diasSemana[hoy.getDay()];
    const dia = hoy.getDate();
    const mes = meses[hoy.getMonth()];
    return `${diaSemana} ${dia} de ${mes}`;
  };

  // Obtener clase CSS de estado
  const getClaseEstado = (estado) => {
    const mapa = {
      'CONFIRMADA': 'confirmada',
      'PENDIENTE': 'pendiente',
      'COMPLETADA': 'completada',
      'CANCELADA': 'cancelada',
      'NO_ASISTIO': 'no-asistio',
    };
    return mapa[estado] || 'pendiente';
  };

  // Estado: cargando
  if (loading) {
    return (
      <div className="agenda-container">
        <div className="agenda-header">
          <h1>Agenda del <span className="highlight">d�a</span></h1>
          <p className="fecha">{obtenerFecha()}</p>
        </div>
        <div className="citas-loading">
          <div className="shimmer" />
          <div className="shimmer" />
          <div className="shimmer" />
        </div>
      </div>
    );
  }

  // Estado: error
  if (error) {
    return (
      <div className="agenda-container">
        <div className="agenda-header">
          <h1>Agenda del <span className="highlight">día</span></h1>
          <p className="fecha">{obtenerFecha()}</p>
        </div>
        <div className="error-box">
          <p>{error}</p>
          <button onClick={cargarAgenda}>Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="agenda-container">
      <div className="agenda-header">
        <h1>Agenda del <span className="highlight">día</span></h1>
        <p className="fecha">{obtenerFecha()}</p>
      </div>

      {/* Filtros */}
      <div className="filtros">
        <button
          className={`filtro-btn ${filtro === 'todas' ? 'activo' : ''}`}
          onClick={() => setFiltro('todas')}
        >
          Todas ({contadores.todas})
        </button>
        <button
          className={`filtro-btn ${filtro === 'confirmadas' ? 'activo' : ''}`}
          onClick={() => setFiltro('confirmadas')}
        >
          Confirmadas ({contadores.confirmadas})
        </button>
        <button
          className={`filtro-btn ${filtro === 'pendientes' ? 'activo' : ''}`}
          onClick={() => setFiltro('pendientes')}
        >
          Pendientes ({contadores.pendientes})
        </button>
        <button
          className={`filtro-btn ${filtro === 'completadas' ? 'activo' : ''}`}
          onClick={() => setFiltro('completadas')}
        >
          Completadas ({contadores.completadas})
        </button>
        <button
          className={`filtro-btn ${filtro === 'canceladas' ? 'activo' : ''}`}
          onClick={() => setFiltro('canceladas')}
        >
          Canceladas ({contadores.canceladas})
        </button>
      </div>

      {/* Layout 2-col (desktop) / 1-col (móvil) */}
<div className={`agenda-layout ${citaSeleccionada ? 'detalle-abierto' : ''}`}>
  {citaSeleccionada && <div className="mobile-overlay" onClick={() => setCitaSeleccionada(null)} />}
  {/* LISTA IZQUIERDA */}
  <div className="agenda-lista">
    {citasFiltradas.length === 0 ? (
      <div className="empty-state">
        <p>No hay citas con este filtro</p>
      </div>
          ) : (
            <div className="citas-list">
              {citasFiltradas.map((cita) => (
                <div
                  key={cita.id}
                  className={`cita-card ${citaSeleccionada?.id === cita.id ? 'activa' : ''}`}
                  onClick={() => setCitaSeleccionada(cita)}
                >
                  <div className="cita-hora">{cita.hora}</div>
                  <div className="cita-info">
                    <div className="cita-nombre">{cita.nombre}</div>
                    <div className="cita-detalle">{cita.profesional || 'Sin asignar'} · {cita.servicio}</div>
                  </div>
                  <div className={`badge badge-${getClaseEstado(cita.estado)}`}>
                    {cita.estado.toLowerCase()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PANEL DERECHO */}
       <div className={`agenda-detalle ${citaSeleccionada ? 'mostrado' : ''}`}>
          {citaSeleccionada ? (
            <>
              <div className="detalle-header">
                <h2>{citaSeleccionada.nombre}</h2>
              </div>

              <div className="detail-info">
                <div className="detail-row">
                  <span className="detail-label">Hora</span>
                  <span className="detail-value">{citaSeleccionada.hora}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Servicio</span>
                  <span className="detail-value">{citaSeleccionada.servicio}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Profesional</span>
                  <span className="detail-value">{citaSeleccionada.profesional || 'Sin asignar'}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Teléfono</span>
                  <span className="detail-value">{citaSeleccionada.telefono || 'No registrado'}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">RUT</span>
                  <span className="detail-value">{citaSeleccionada.rut || 'No registrado'}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Estado</span>
                  <span className={`detail-value badge badge-${getClaseEstado(citaSeleccionada.estado)}`}>
                    {citaSeleccionada.estado.toLowerCase()}
                  </span>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="sheet-actions">
                {citaSeleccionada.estado === 'PENDIENTE' && (
                  <button
                    className="btn btn-primary"
                    onClick={handleConfirmar}
                    disabled={accionando}
                  >
                    ✓ Confirmar cita
                  </button>
                )}

                {citaSeleccionada.estado === 'CONFIRMADA' && (
                  <>
                    <button
                      className="btn btn-primary"
                      onClick={handleCompletar}
                      disabled={accionando}
                    >
                      ✓ Marcar como completada
                    </button>
                    <button
                      className="btn btn-warning"
                      onClick={handleNoAsistio}
                      disabled={accionando}
                    >
                      ✗ No asistió
                    </button>
                  </>
                )}

               {citaSeleccionada.estado !== 'CANCELADA' && (
                  <>
                    <button
                      className="btn btn-secondary"
                      onClick={handleReagendar}
                      disabled={accionando}
                    >
                      ↻ Reagendar para otro d�a
                    </button>

                    <button
                      className="btn btn-danger-outline"
                      onClick={handleCancelar}
                      disabled={accionando}
                    >
                      ✕ Cancelar cita
                    </button>
                  </>
                )}

             {citaSeleccionada.estado === 'CANCELADA' && avisoWhatsApp && (
                  (() => {
                    const link = construirLinkWhatsApp(avisoWhatsApp);
                    return link ? (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                      >
                        Avisar por WhatsApp
                      </a>
                    ) : (
                      <p className="texto-muted">No se pudo generar el link de WhatsApp (tel�fono no registrado o inv�lido).</p>
                    );
                  })()
                )}
              </div>
            </>
          ) : (
            <div className="detalle-vacio">
              <p>Selecciona una cita para ver detalles</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de reagendamiento */}
      <CalendarPickerModal
        isOpen={modalAbierto}
        onClose={() => {
          setModalAbierto(false);
          setCitaAReagendar(null);
        }}
        onConfirm={handleConfirmarReagendamiento}
        recursoId={citaAReagendar?.id}
        token={token}
      />
    </div>
  );
}

