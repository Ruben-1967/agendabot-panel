import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import CalendarPickerModal from '../../components/CalendarPickerModal';
import './AgendaDia.css';

export default function AgendaDia() {
  const { usuario, token } = useAuth();
  const [citas, setCitas] = useState([]);
  const [filtro, setFiltro] = useState('todas');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [citaSeleccionada, setCitaSeleccionada] = useState(null);
  const [accionando, setAccionando] = useState(false);
  
  // NUEVO: States para CalendarPickerModal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [citaAReagendar, setCitaAReagendar] = useState(null);

  useEffect(() => {
    if (token) cargarAgenda();
  }, [token]);

  const cargarAgenda = async () => {
    try {
      setLoading(true);
      const empresaId = usuario?.empresaId;
      if (!empresaId) {
        throw new Error('No hay empresaId en la sesión');
      }
      const res = await fetch(`https://agendabot-backend-bbw5.onrender.com/agenda/dashboard/${empresaId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al cargar agenda');
      const data = await res.json();
      setCitas(data.agendaHoy || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const citasFiltradas = citas.filter((c) => {
    if (filtro === 'todas') return true;
    if (filtro === 'confirmadas') return c.estado === 'CONFIRMADA';
    if (filtro === 'pendientes') return c.estado === 'PENDIENTE';
    if (filtro === 'canceladas') return c.estado === 'CANCELADA';
    return true;
  });

  const handleConfirmar = async () => {
    setAccionando(true);
    try {
      const res = await fetch(`https://agendabot-backend-bbw5.onrender.com/agenda/citas/${citaSeleccionada.id}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nuevoEstado: 'CONFIRMADA' }),
      });
      if (!res.ok) throw new Error('Error confirmando cita');
      await cargarAgenda();
      setCitaSeleccionada(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setAccionando(false);
    }
  };

  const handleCancelar = async () => {
    if (!window.confirm('¿Confirmas que deseas cancelar esta cita?')) return;
    setAccionando(true);
    try {
      const res = await fetch(`https://agendabot-backend-bbw5.onrender.com/agenda/citas/${citaSeleccionada.id}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nuevoEstado: 'CANCELADA' }),
      });
      if (!res.ok) throw new Error('Error cancelando cita');
      await cargarAgenda();
      setCitaSeleccionada(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setAccionando(false);
    }
  };

  // MODIFICADO: Abre el modal en lugar de llamar al endpoint directo
  const handleReagendar = async () => {
    if (!citaSeleccionada) return;
    setCitaAReagendar(citaSeleccionada);
    setModalAbierto(true);
  };

  // NUEVO: Confirma el reagendamiento desde el modal
  const handleConfirmarReagendamiento = async (selection) => {
    if (!citaAReagendar) return;
    
    setAccionando(true);
    try {
      const res = await fetch(
        `https://agendabot-backend-bbw5.onrender.com/agenda/citas/${citaAReagendar.id}/reagendar`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            nuevaFecha: selection.fecha,
            nuevaHora: selection.hora,
            profesionalId: selection.profesionalId,
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
      alert(err.message);
    } finally {
      setAccionando(false);
    }
  };

  const obtenerFecha = () => {
    const hoy = new Date();
    const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const diaSemana = diasSemana[hoy.getDay()];
    const dia = hoy.getDate();
    const mes = meses[hoy.getMonth()];
    return `${diaSemana} ${dia} de ${mes}`;
  };

  if (loading) {
    return (
      <div className="agenda-container">
        <div className="agenda-header">
          <h1>Agenda del dia</h1>
          <p className="fecha">{obtenerFecha()}</p>
        </div>
        <div className="loading">Cargando agenda...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="agenda-container">
        <div className="agenda-header">
          <h1>Agenda del dia</h1>
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
        <h1>Agenda del dia</h1>
        <p className="fecha">{obtenerFecha()}</p>
      </div>

      <div className="filtros">
        <button
          className={`filtro-btn ${filtro === 'todas' ? 'activo' : ''}`}
          onClick={() => setFiltro('todas')}
        >
          Todas ({citas.length})
        </button>
        <button
          className={`filtro-btn ${filtro === 'pendientes' ? 'activo' : ''}`}
          onClick={() => setFiltro('pendientes')}
        >
          Pendientes ({citas.filter((c) => c.estado === 'PENDIENTE').length})
        </button>
        <button
          className={`filtro-btn ${filtro === 'confirmadas' ? 'activo' : ''}`}
          onClick={() => setFiltro('confirmadas')}
        >
          Confirmadas ({citas.filter((c) => c.estado === 'CONFIRMADA').length})
        </button>
        <button
          className={`filtro-btn ${filtro === 'canceladas' ? 'activo' : ''}`}
          onClick={() => setFiltro('canceladas')}
        >
          Canceladas ({citas.filter((c) => c.estado === 'CANCELADA').length})
        </button>
      </div>

      <div className="agenda-split">
        <div className="citas-lista">
          {citasFiltradas.length === 0 ? (
            <div className="empty-state">No hay citas con este filtro</div>
          ) : (
            citasFiltradas.map((cita) => (
              <div
                key={cita.id}
                className={`cita-item ${citaSeleccionada?.id === cita.id ? 'activo' : ''}`}
                onClick={() => setCitaSeleccionada(cita)}
              >
                <div className="cita-hora">{cita.hora}</div>
                <div className="cita-info">
                  <div className="cita-cliente">{cita.clienteNombre}</div>
                  <div className="cita-servicio">{cita.servicioNombre || 'Servicio general'}</div>
                </div>
                <div className={`cita-estado ${cita.estado.toLowerCase()}`}>
                  {cita.estado}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="cita-detalle">
          {citaSeleccionada ? (
            <>
              <div className="detalle-header">
                <h2>{citaSeleccionada.clienteNombre}</h2>
              </div>

              <div className="detalle-info">
                <div className="info-grupo">
                  <label>Fecha y Hora</label>
                  <p>{citaSeleccionada.fechaCompleta} - {citaSeleccionada.hora}</p>
                </div>

                <div className="info-grupo">
                  <label>Servicio</label>
                  <p>{citaSeleccionada.servicioNombre || 'No especificado'}</p>
                </div>

                <div className="info-grupo">
                  <label>Teléfono</label>
                  <p>{citaSeleccionada.telefonoCliente || 'No registrado'}</p>
                </div>

                <div className="info-grupo">
                  <label>Estado</label>
                  <p className={`estado-badge ${citaSeleccionada.estado.toLowerCase()}`}>
                    {citaSeleccionada.estado}
                  </p>
                </div>
              </div>

              <div className="detalle-botones">
                {citaSeleccionada.estado === 'PENDIENTE' && (
                  <button
                    className="btn-confirmar"
                    onClick={handleConfirmar}
                    disabled={accionando}
                  >
                    Confirmar cita
                  </button>
                )}

                {citaSeleccionada.estado !== 'CANCELADA' && (
                  <>
                    <button
                      className="btn-reagendar"
                      onClick={handleReagendar}
                      disabled={accionando}
                    >
                      Reagendar
                    </button>

                    <button
                      className="btn-cancelar"
                      onClick={handleCancelar}
                      disabled={accionando}
                    >
                      Cancelar cita
                    </button>
                  </>
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

      {/* NUEVO: CalendarPickerModal */}
      <CalendarPickerModal
        isOpen={modalAbierto}
        onClose={() => {
          setModalAbierto(false);
          setCitaAReagendar(null);
        }}
        onConfirm={handleConfirmarReagendamiento}
        recursoId={citaAReagendar?.recursoAgendableId}
        token={token}
      />
    </div>
  );
}