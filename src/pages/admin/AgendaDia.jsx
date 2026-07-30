import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './AgendaDia.css';

export default function AgendaDia() {
  const { usuario } = useAuth();
  const [citas, setCitas] = useState([]);
  const [filtro, setFiltro] = useState('todas');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [citaSeleccionada, setCitaSeleccionada] = useState(null);
  const [accionando, setAccionando] = useState(false);

  useEffect(() => {
    cargarAgenda();
  }, [usuario]);

  const cargarAgenda = async () => {
    try {
      setLoading(true);
      const empresaId = usuario?.empresaId;
      if (!empresaId) {
        throw new Error('No hay empresaId en la sesión');
      }

      const res = await fetch(`https://agendabot-backend-bbw5.onrender.com/agenda/dashboard/${empresaId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
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
          Authorization: `Bearer ${localStorage.getItem('token')}`,
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
          Authorization: `Bearer ${localStorage.getItem('token')}`,
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
          Authorization: `Bearer ${localStorage.getItem('token')}`,
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
      CONFIRMADA: 'Confirmada',
      PENDIENTE: 'Pendiente',
      COMPLETADA: 'Completada',
      CANCELADA: 'Cancelada',
      NO_ASISTIO: 'No asistió',
    };
    return labels[estado] || estado;
  };

  if (loading) {
    return (
      <div className="agenda-container">
        <div className="agenda-header">
          <h1>Agenda del día</h1>
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
          <h1>Agenda del día</h1>
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
        <h1>Agenda del día</h1>
      </div>

      {/* Filtros */}
      <div className="filtros">
        <button
          className={`filtro-btn ${filtro === 'todas' ? 'activo' : ''}`}
          onClick={() => setFiltro('todas')}
        >
          Todas ({citas.length})
        </button>
        <button
          className={`filtro-btn ${filtro === 'confirmadas' ? 'activo' : ''}`}
          onClick={() => setFiltro('confirmadas')}
        >
          Confirmadas ({citas.filter((c) => c.estado === 'CONFIRMADA').length})
        </button>
        <button
          className={`filtro-btn ${filtro === 'pendientes' ? 'activo' : ''}`}
          onClick={() => setFiltro('pendientes')}
        >
          Pendientes ({citas.filter((c) => c.estado === 'PENDIENTE').length})
        </button>
        <button
          className={`filtro-btn ${filtro === 'canceladas' ? 'activo' : ''}`}
          onClick={() => setFiltro('canceladas')}
        >
          Canceladas ({citas.filter((c) => c.estado === 'CANCELADA').length})
        </button>
      </div>

      {/* Lista de citas */}
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
                <div className="cita-servicio">{cita.servicio}</div>
                <div className="cita-profesional">👤 {cita.profesional}</div>
              </div>
              <div className={`badge ${getBadgeClass(cita.estado)}`}>
                {getEstadoLabel(cita.estado)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Sheet - Detalles de cita */}
      {citaSeleccionada && (
        <div className="bottom-sheet-overlay" onClick={() => setCitaSeleccionada(null)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-header">
              <div className="sheet-handle"></div>
              <button className="sheet-close" onClick={() => setCitaSeleccionada(null)}>
                ✕
              </button>
            </div>

            <div className="sheet-content">
              <h2>{citaSeleccionada.nombre}</h2>

              <div className="detail-grid">
                <div className="detail-item">
                  <span className="label">Hora</span>
                  <span className="value">{citaSeleccionada.hora}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Servicio</span>
                  <span className="value">{citaSeleccionada.servicio}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Profesional</span>
                  <span className="value">{citaSeleccionada.profesional}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Estado</span>
                  <span className={`value badge ${getBadgeClass(citaSeleccionada.estado)}`}>
                    {getEstadoLabel(citaSeleccionada.estado)}
                  </span>
                </div>
                {citaSeleccionada.telefono && (
                  <div className="detail-item">
                    <span className="label">Teléfono</span>
                    <span className="value">{citaSeleccionada.telefono}</span>
                  </div>
                )}
                {citaSeleccionada.rut && (
                  <div className="detail-item">
                    <span className="label">RUT</span>
                    <span className="value">{citaSeleccionada.rut}</span>
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div className="sheet-actions">
                {citaSeleccionada.estado === 'PENDIENTE' && (
                  <button className="btn btn-primary" onClick={handleConfirmar} disabled={accionando}>
                    Confirmar
                  </button>
                )}
                {(citaSeleccionada.estado === 'CONFIRMADA' ||
                  citaSeleccionada.estado === 'PENDIENTE') && (
                  <button className="btn btn-success" onClick={handleMarcarAsistencia} disabled={accionando}>
                    Marcar asistencia
                  </button>
                )}
                {citaSeleccionada.estado !== 'CANCELADA' && (
                  <button className="btn btn-danger" onClick={handleCancelar} disabled={accionando}>
                    Cancelar
                  </button>
                )}
                <button className="btn btn-secondary" onClick={() => setCitaSeleccionada(null)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
