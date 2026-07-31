import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './AgendaDia.css';

export default function AgendaDia() {
  const { usuario, token } = useAuth();
  const [citas, setCitas] = useState([]);
  const [filtro, setFiltro] = useState('todas');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [citaSeleccionada, setCitaSeleccionada] = useState(null);
  const [accionando, setAccionando] = useState(false);

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
        body: JSON.stringify({ estado: 'CONFIRMADA' }),
      });
      if (res.ok) {
        cargarAgenda();
        setCitaSeleccionada(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAccionando(false);
    }
  };

  const handleMarcarAsistencia = async () => {
    setAccionando(true);
    try {
      const res = await fetch(`https://agendabot-backend-bbw5.onrender.com/agenda/citas/${citaSeleccionada.id}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ estado: 'COMPLETADA' }),
      });
      if (res.ok) {
        cargarAgenda();
        setCitaSeleccionada(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAccionando(false);
    }
  };

  const handleCancelar = async () => {
    setAccionando(true);
    try {
      const res = await fetch(`https://agendabot-backend-bbw5.onrender.com/agenda/citas/${citaSeleccionada.id}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ estado: 'CANCELADA' }),
      });
      if (res.ok) {
        cargarAgenda();
        setCitaSeleccionada(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAccionando(false);
    }
  };

  const handleReagendar = async () => {
    // Abre modal para elegir nueva fecha/hora
    // Por ahora, solo revertir a PENDIENTE
    setAccionando(true);
    try {
      const res = await fetch(`https://agendabot-backend-bbw5.onrender.com/agenda/citas/${citaSeleccionada.id}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ estado: 'PENDIENTE' }),
      });
      if (res.ok) {
        cargarAgenda();
        setCitaSeleccionada(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAccionando(false);
    }
  };

  const handleReactivar = async () => {
    setAccionando(true);
    try {
      const res = await fetch(`https://agendabot-backend-bbw5.onrender.com/agenda/citas/${citaSeleccionada.id}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ estado: 'PENDIENTE' }),
      });
      if (res.ok) {
        cargarAgenda();
        setCitaSeleccionada(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAccionando(false);
    }
  };

  const getBadgeClass = (estado) => {
    switch (estado) {
      case 'CONFIRMADA':
        return 'badge-confirmada';
      case 'PENDIENTE':
        return 'badge-pendiente';
      case 'COMPLETADA':
        return 'badge-completada';
      case 'CANCELADA':
        return 'badge-cancelada';
      case 'NO_ASISTIO':
        return 'badge-no-asistio';
      default:
        return '';
    }
  };

  const getEstadoLabel = (estado) => {
    const labels = {
      CONFIRMADA: 'confirmada',
      PENDIENTE: 'pendiente',
      COMPLETADA: 'completada',
      CANCELADA: 'cancelada',
      NO_ASISTIO: 'no asistió',
    };
    return labels[estado] || estado;
  };

  const obtenerFecha = () => {
    const hoy = new Date();
    const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
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
          <h1>Agenda de <span className="highlight">hoy</span></h1>
          <p className="fecha">{obtenerFecha()}</p>
        </div>
        <div className="citas-loading">
          <div className="shimmer"></div>
          <div className="shimmer"></div>
          <div className="shimmer"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="agenda-container">
        <div className="agenda-header">
          <h1>Agenda de <span className="highlight">hoy</span></h1>
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
        <h1>Agenda de <span className="highlight">hoy</span></h1>
        <p className="fecha">{obtenerFecha()}</p>
      </div>

      <div className="filtros">
        <button
          className={`filtro-btn ${filtro === 'todas' ? 'activo' : ''}`}
          onClick={() => setFiltro('todas')}
        >
          todas
        </button>
        <button
          className={`filtro-btn ${filtro === 'confirmadas' ? 'activo' : ''}`}
          onClick={() => setFiltro('confirmadas')}
        >
          confirmadas
        </button>
        <button
          className={`filtro-btn ${filtro === 'pendientes' ? 'activo' : ''}`}
          onClick={() => setFiltro('pendientes')}
        >
          pendientes
        </button>
        <button
          className={`filtro-btn ${filtro === 'canceladas' ? 'activo' : ''}`}
          onClick={() => setFiltro('canceladas')}
        >
          canceladas
        </button>
      </div>

      <div className="citas-list">
        {citasFiltradas.length === 0 ? (
          <div className="empty-state">
            <p>No hay citas en esta categoría</p>
          </div>
        ) : (
          citasFiltradas.map((cita) => (
            <div
              key={cita.id}
              className="cita-card"
              onClick={() => setCitaSeleccionada(cita)}
            >
              <div className="cita-hora">{cita.hora}</div>
              <div className="cita-info">
                <div className="cita-nombre">{cita.nombre}</div>
                <div className="cita-detalle">{cita.profesional} · {cita.servicio}</div>
              </div>
              <div className={`badge ${getBadgeClass(cita.estado)}`}>
                {getEstadoLabel(cita.estado)}
              </div>
            </div>
          ))
        )}
      </div>

      {citaSeleccionada && (
        <div className="bottom-sheet-overlay" onClick={() => setCitaSeleccionada(null)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-header">
              <div className="sheet-header-content">
                <div className="sheet-hora">{citaSeleccionada.hora}</div>
                <div className={`badge ${getBadgeClass(citaSeleccionada.estado)}`}>
                  {getEstadoLabel(citaSeleccionada.estado)}
                </div>
              </div>
              <button className="sheet-close" onClick={() => setCitaSeleccionada(null)}>
                ✕
              </button>
            </div>

            <div className="sheet-content">
              <h2>{citaSeleccionada.nombre}</h2>

              <div className="detail-info">
                <div className="detail-row">
                  <span className="detail-label">Teléfono</span>
                  <span className="detail-value">{citaSeleccionada.telefono || '—'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Última compra</span>
                  <span className="detail-value">—</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Observaciones</span>
                  <span className="detail-value">—</span>
                </div>
              </div>

             <div className="sheet-actions">
  {citaSeleccionada.estado === 'PENDIENTE' && (
    <button className="btn btn-primary" onClick={handleConfirmar} disabled={accionando}>
      confirmar
    </button>
  )}
  <button className="btn btn-secondary" onClick={handleReagendar} disabled={accionando}>
    reagendar
  </button>
  {citaSeleccionada.estado !== 'CANCELADA' && (
    <button className="btn btn-secondary" onClick={handleMarcarAsistencia} disabled={accionando}>
      marcar asistencia
    </button>
  )}
  {citaSeleccionada.estado !== 'CANCELADA' && (
    <button className="btn btn-danger-outline" onClick={handleCancelar} disabled={accionando}>
      cancelar
    </button>
  )}
  {citaSeleccionada.estado === 'CANCELADA' && (
    <button className="btn btn-warning" onClick={handleReactivar} disabled={accionando}>
      reactivar
    </button>
  )}
</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
