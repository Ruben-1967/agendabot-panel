import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchDashboard } from '../../api/client';
import './Dashboard.css';

export default function Dashboard() {
  const { token, usuario } = useAuth();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [expandido, setExpandido] = useState(false);

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

  if (cargando) {
    return <div className="dashboard-loading">Cargando dashboard…</div>;
  }

  if (error) {
    return <div className="dashboard-error">Error: {error}</div>;
  }

  if (!datos) {
    return <div className="dashboard-empty">Sin datos disponibles</div>;
  }

  return (
    <div className="dashboard-container">
      <h2>Dashboard</h2>

      {/* 4 tarjetas de resumen */}
      <div className="dashboard-grid">
        <Tarjeta titulo="Citas hoy" valor={datos.citasHoy} color="azul" />
        <Tarjeta titulo="Confirmadas" valor={datos.confirmadas} color="verde" />
        <Tarjeta titulo="Lista de espera" valor={datos.listaEspera} color="ámbar" />
        <Tarjeta
          titulo="Asistencia 30 días"
          valor={`${Math.round(datos.asistencia30dias)}%`}
          color="púrpura"
        />
      </div>

      {/* Lista colapsable de agenda del día */}
      <div className="dashboard-agenda">
        <button
          className="agenda-header"
          onClick={() => setExpandido(!expandido)}
        >
          <span className="agenda-titulo">Agenda del día</span>
          <span className={`agenda-toggle ${expandido ? 'abierto' : ''}`}>▼</span>
        </button>

        {expandido && (
          <div className="agenda-lista">
            {datos.agendaHoy && datos.agendaHoy.length > 0 ? (
              <ul>
                {datos.agendaHoy.map((cita) => (
                  <li key={cita.id} className={`cita-${cita.estado.toLowerCase()}`}>
                    <span className="cita-hora">{cita.hora}</span>
                    <span className="cita-cliente">{cita.nombre}</span>
                    <span className={`cita-estado estado-${cita.estado.toLowerCase()}`}>
                      {cita.estado}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sin-citas">Sin citas hoy</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Tarjeta({ titulo, valor, color }) {
  return (
    <div className={`tarjeta tarjeta-${color}`}>
      <p className="tarjeta-titulo">{titulo}</p>
      <p className="tarjeta-valor">{valor}</p>
    </div>
  );
}