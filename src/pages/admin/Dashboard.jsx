import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchDashboard } from '../../api/client';
import './Dashboard.css';

function formatearFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatearHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function Dashboard() {
  const { token } = useAuth();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    function cargar() {
      setCargando(true);
      setError('');
      fetchDashboard(token)
        .then((data) => {
          setDatos(data);
        })
        .catch((err) => {
          setError(err.message || 'Error al cargar dashboard');
        })
        .finally(() => setCargando(false));
    }
    cargar();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (cargando) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <p className="dashboard-header-sub">Cargando…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
        </div>
        <div className="dashboard-error">{error}</div>
      </div>
    );
  }

  if (!datos) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
        </div>
      </div>
    );
  }

  const {
    citasHoy = 0,
    confirmadas = 0,
    pendientes = 0,
    listaEsperaCount = 0,
    asistenciaPromedio = 0,
    agenda = [],
    listaEspera = [],
    nombreEmpresa = 'Mi negocio',
  } = datos;

  const hoy = new Date();
  const hoyFormato = hoy.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Hola, {nombreEmpresa}</h1>
        <p className="dashboard-header-sub">Hoy · {hoyFormato}</p>
      </div>

      {/* GRID DE TARJETAS KPI */}
      <div className="dashboard-grid">
        <div className={`metric-card ${citasHoy === 0 ? 'empty' : ''}`}>
          <div className="metric-label">Citas hoy</div>
          <div className="metric-value">{citasHoy}</div>
          <div className="metric-description">
            {confirmadas} confirmadas, {pendientes} pendientes
          </div>
        </div>

        <div className={`metric-card ${confirmadas === 0 ? 'empty' : ''}`}>
          <div className="metric-label">Confirmadas</div>
          <div className="metric-value">{confirmadas}</div>
          <div className="metric-description">de {citasHoy} citas agendadas</div>
        </div>

        <div className={`metric-card ${listaEsperaCount === 0 ? 'empty' : ''}`}>
          <div className="metric-label">Lista de espera</div>
          <div className="metric-value">{listaEsperaCount}</div>
          <div className="metric-description">
            {listaEsperaCount === 1 ? 'cliente' : 'clientes'} esperando cupo
          </div>
        </div>

        <div className={`metric-card ${asistenciaPromedio === 0 ? 'empty' : ''}`}>
          <div className="metric-label">Asistencia (30 días)</div>
          <div className="metric-value">{Math.round(asistenciaPromedio)}%</div>
          <div className="metric-description">
            {isNaN(asistenciaPromedio) || !isFinite(asistenciaPromedio)
              ? '0 de NaN citas asistidas'
              : `${Math.round(asistenciaPromedio)}% de efectividad`}
          </div>
        </div>
      </div>

      {/* LAYOUT AGENDA + LISTA DE ESPERA */}
      <div className="dashboard-main">
        {/* AGENDA DEL DÍA */}
        <div className="agenda-section">
          <div className="agenda-header">
            <h2>Agenda de hoy</h2>
            <a href="/agenda-completa">ver agenda completa →</a>
          </div>

          {agenda.length === 0 ? (
            <div className="agenda-list">
              <div className="agenda-item-empty" />
              <div className="agenda-item-empty" />
              <div className="agenda-item-empty" />
            </div>
          ) : (
            <div className="agenda-list">
              {agenda.slice(0, 5).map((cita) => (
                <div
                  key={cita.id}
                  className={`agenda-item ${cita.estado || 'pendiente'}`}
                >
                  <div className="agenda-hora">{formatearHora(cita.horaInicio)}</div>
                  <div className="agenda-detalle">
                    <div className="agenda-nombre">{cita.clienteNombre}</div>
                    <div className="agenda-servicio">{cita.recursoNombre}</div>
                  </div>
                  <div className={`agenda-badge badge-${cita.estado || 'pendiente'}`}>
                    {cita.estado === 'confirmada'
                      ? 'Confirmada'
                      : cita.estado === 'cancelada'
                      ? 'Cancelada'
                      : 'Pendiente'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* LISTA DE ESPERA */}
        <div className="espera-section">
          <div className="espera-header">
            <h2>Lista de espera</h2>
          </div>

          {listaEspera.length === 0 ? (
            <div className="espera-list">
              <div
                style={{
                  padding: '2rem 1rem',
                  textAlign: 'center',
                  color: '#999',
                  fontSize: '13px',
                }}
              >
                Sin clientes en lista de espera
              </div>
            </div>
          ) : (
            <div className="espera-list">
              {listaEspera.slice(0, 6).map((item, idx) => (
                <div key={item.id || idx} className="espera-item">
                  <div className="espera-numero">{idx + 1}</div>
                  <div className="espera-detalle">
                    <div className="espera-nombre">{item.clienteNombre}</div>
                    <div className="espera-servicio">{item.recursoNombre}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
