import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchDashboard } from '../../api/client';
import './Dashboard.css';

export default function Dashboard() {
  const { token, usuario } = useAuth();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token || !usuario?.empresaId) {
      setError('No hay sesión válida');
      setCargando(false);
      return;
    }

    fetchDashboard(token, usuario.empresaId)
      .then(setDatos)
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, [token, usuario?.empresaId]);

  if (error) {
    return <div className="dashboard-error">Error: {error}</div>;
  }

  const datos_seguros = datos || {
    citasHoy: 0,
    confirmadas: 0,
    listaEspera: 0,
    asistencia30dias: 0,
    agendaHoy: [],
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Hola, equipo {usuario?.empresa || 'Negocio'}</h1>
        <p className="dashboard-header-sub">
          Hoy · {usuario?.nombre || 'Sucursal'}
        </p>
      </div>

      {/* 4 tarjetas de resumen */}
      <div className="dashboard-grid">
        <div className={`metric-card ${datos ? 'filled' : 'empty'}`}>
          <span className="metric-label">Citas hoy</span>
          <span className="metric-value">{datos_seguros.citasHoy}</span>
        </div>

        <div className={`metric-card ${datos ? 'filled' : 'empty'}`}>
          <span className="metric-label">Confirmadas</span>
          <span className="metric-value">{datos_seguros.confirmadas}</span>
        </div>

        <div className={`metric-card ${datos ? 'filled' : 'empty'}`}>
          <span className="metric-label">Lista de espera</span>
          <span className="metric-value">{datos_seguros.listaEspera}</span>
        </div>

        <div className={`metric-card ${datos ? 'filled' : 'empty'}`}>
          <span className="metric-label">Asistencia (30 días)</span>
          <span className="metric-value">{Math.round(datos_seguros.asistencia30dias)}%</span>
        </div>
      </div>

      {/* Agenda del día */}
      <div className="agenda-section">
        <div className="agenda-header-title">
          <h2>Agenda de hoy</h2>
        </div>

        <div className="agenda-list">
          {datos_seguros.agendaHoy && datos_seguros.agendaHoy.length > 0 ? (
            datos_seguros.agendaHoy.map((cita) => (
              <div key={cita.id} className="agenda-item">
                <div className="agenda-hora">{cita.hora}</div>
                <div className="agenda-detalle">
                  <div className="agenda-nombre">{cita.nombre}</div>
                  <div className="agenda-servicio">
                    {cita.servicio} · {cita.profesional}
                  </div>
                </div>
                <div className={`agenda-badge estado-${cita.estado.toLowerCase()}`}>
                  {cita.estado}
                </div>
              </div>
            ))
          ) : (
            <>
              <div className="agenda-item-empty"></div>
              <div className="agenda-item-empty"></div>
              <div className="agenda-item-empty"></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}