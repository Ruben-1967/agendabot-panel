import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchDashboard, fetchProfesionales } from '../../api/client';
import { BarChartSerie, LineChartSerie, BarChartCategorias, formatoCLP, COLOR_DINERO, formatearDiaSemanaCorto } from './DashboardCharts';
import './Dashboard.css';

export default function Dashboard() {
  const { token, usuario } = useAuth();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [profesionales, setProfesionales] = useState([]);
  const [recursoFiltro, setRecursoFiltro] = useState('');

  // Cargar la lista de profesionales una sola vez, para saber si mostrar
  // el selector (solo tiene sentido con más de uno).
  useEffect(() => {
    if (!token) return;
    fetchProfesionales(token)
      .then((data) => setProfesionales(data.profesionales || []))
      .catch(() => {}); // si falla, simplemente no se muestra el selector
  }, [token]);

  useEffect(() => {
    if (!token || !usuario?.empresaId) {
      setError('No hay sesión válida');
      setCargando(false);
      return;
    }

    setCargando(true);
    fetchDashboard(token, usuario.empresaId, recursoFiltro || undefined)
      .then(setDatos)
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, [token, usuario?.empresaId, recursoFiltro]);

  if (error) {
    return <div className="dashboard-error">Error: {error}</div>;
  }

  const datos_seguros = datos || {
    citasHoy: 0,
    confirmadas: 0,
    listaEspera: 0,
    asistencia30dias: 0,
    agendaHoy: [],
    listaEsperaItems: [],
    atencionesHoy: 0,
    montoHoy: 0,
    montoSemana: 0,
    citasProximosDias: [],
    citasPorDia: [],
    atencionesPorTipo: [],
    citasPorMes: [],
    dineroPorMes: [],
  };

  // Obtener fecha de hoy formateada
  const hoy = new Date();
  const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const fechaFormato = `${diasSemana[hoy.getDay()]} ${hoy.getDate()} ${meses[hoy.getMonth()]}`;

  // ✅ FIX: Cálculo seguro de citas asistidas (sin división por cero)
  const citasAsistidas = datos_seguros.asistencia30dias > 0 && datos_seguros.citasHoy > 0
    ? Math.round((datos_seguros.citasHoy * datos_seguros.asistencia30dias) / 100)
    : 0;

  return (
    <div className="dashboard-container">
   <div className="dashboard-header">
        <h1>Hola, {usuario?.empresaNombre || 'equipo'}</h1>
        <p className="dashboard-header-sub">
          Hoy · {fechaFormato}
        </p>
        {profesionales.length > 1 && (
          <select
            className="dashboard-filtro-profesional"
            value={recursoFiltro}
            onChange={(e) => setRecursoFiltro(e.target.value)}
          >
            <option value="">Todos los profesionales</option>
            {profesionales.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        )}
      </div>

      {/* 4 tarjetas KPI */}
      <div className="dashboard-grid">
        <div className={`metric-card ${datos ? 'filled' : 'empty'}`}>
          <span className="metric-label">Citas hoy</span>
          <span className="metric-value">{datos_seguros.citasHoy}</span>
          <span className="metric-description">
            {datos_seguros.confirmadas} confirmadas, {Math.max(0, datos_seguros.citasHoy - datos_seguros.confirmadas)} pendientes
          </span>
        </div>

        <div className={`metric-card ${datos ? 'filled' : 'empty'}`}>
          <span className="metric-label">Confirmadas</span>
          <span className="metric-value">{datos_seguros.confirmadas}</span>
          <span className="metric-description">
            de {datos_seguros.citasHoy} citas agendadas
          </span>
        </div>

        <div className={`metric-card ${datos ? 'filled' : 'empty'}`}>
          <span className="metric-label">Atenciones hoy</span>
          <span className="metric-value">{datos_seguros.atencionesHoy}</span>
          <span className="metric-description">
            ventas/atenciones registradas hoy
          </span>
        </div>

        <div className={`metric-card ${datos ? 'filled' : 'empty'}`}>
          <span className="metric-label">Asistencia (30 días)</span>
          <span className="metric-value">{Math.round(datos_seguros.asistencia30dias)}%</span>
          <span className="metric-description">
            {citasAsistidas} de {datos_seguros.citasHoy} citas asistidas
          </span>
        </div>

        <div className={`metric-card ${datos ? 'filled' : 'empty'}`}>
          <span className="metric-label">Monto hoy</span>
          <span className="metric-value">{formatoCLP.format(datos_seguros.montoHoy)}</span>
          <span className="metric-description">registrado en atenciones/ventas de hoy</span>
        </div>

        <div className={`metric-card ${datos ? 'filled' : 'empty'}`}>
          <span className="metric-label">Monto esta semana</span>
          <span className="metric-value">{formatoCLP.format(datos_seguros.montoSemana)}</span>
          <span className="metric-description">de lunes a hoy</span>
        </div>
      </div>

      {/* Gráficos de negocio */}
      <div className="dashboard-graficos">
        <div className="grafico-card">
          <h2>Citas — próximos 6 días</h2>
          <BarChartSerie
            datos={datos_seguros.citasProximosDias.map((d) => ({ label: d.fecha, value: d.cantidad }))}
            etiquetaEje="Citas agendadas por día, próximos 6 días"
            formatoEtiqueta={(v) => `${v} cita${v === 1 ? '' : 's'}`}
            formatoEtiquetaEje={formatearDiaSemanaCorto}
            todasLasEtiquetas
          />
        </div>

        <div className="grafico-card">
          <h2>Citas — últimos 14 días</h2>
          <BarChartSerie
            datos={datos_seguros.citasPorDia.map((d) => ({ label: d.fecha, value: d.cantidad }))}
            etiquetaEje="Citas por día, últimos 14 días"
            formatoEtiqueta={(v) => `${v} cita${v === 1 ? '' : 's'}`}
          />
        </div>

        <div className="grafico-card">
          <h2>Atenciones por tipo de servicio</h2>
          <BarChartCategorias
            datos={datos_seguros.atencionesPorTipo.map((d) => ({ categoria: d.categoria, cantidad: d.cantidad }))}
          />
        </div>

        <div className="grafico-card">
          <h2>Evolución mensual de citas</h2>
          <LineChartSerie
            datos={datos_seguros.citasPorMes.map((d) => ({ label: d.mes, value: d.cantidad }))}
            etiquetaEje="Citas por mes, últimos 6 meses"
            formatoEtiqueta={(v) => `${v} cita${v === 1 ? '' : 's'}`}
          />
        </div>

        <div className="grafico-card">
          <h2>Evolución mensual de dinero</h2>
          <LineChartSerie
            datos={datos_seguros.dineroPorMes.map((d) => ({ label: d.mes, value: d.monto }))}
            color={COLOR_DINERO}
            etiquetaEje="Monto en ventas por mes, últimos 6 meses"
            formatoEtiqueta={(v) => formatoCLP.format(v)}
          />
        </div>
      </div>

      {/* Layout principal: Agenda + Lista de Espera */}
      <div className="dashboard-main">
        {/* Agenda del día */}
        <div className="agenda-section">
          <div className="agenda-header">
            <h2>Agenda de hoy</h2>
            <a href="/admin/agenda">ver agenda completa →</a>
          </div>

          <div className="agenda-list">
            {datos_seguros.agendaHoy && Array.isArray(datos_seguros.agendaHoy) && datos_seguros.agendaHoy.length > 0 ? (
              datos_seguros.agendaHoy.map((cita) => (
                <div key={cita?.id || Math.random()} className={`agenda-item ${(cita?.estado || '').toLowerCase()}`}>
                  <div className="agenda-hora">{cita?.hora || '--:--'}</div>
                  <div className="agenda-detalle">
                    <div className="agenda-nombre">{cita?.nombre || 'Sin nombre'}</div>
                    <div className="agenda-servicio">
                      {cita?.servicio || 'Sin servicio'} · {cita?.profesional || 'Atención general'}
                    </div>
                  </div>
                  <div className={`agenda-badge badge-${(cita?.estado || '').toLowerCase()}`}>
                    {cita?.estado || 'Pendiente'}
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

        {/* Lista de Espera */}
        {datos_seguros.listaEsperaItems && Array.isArray(datos_seguros.listaEsperaItems) && datos_seguros.listaEsperaItems.length > 0 && (
          <div className="espera-section">
            <div className="espera-header">
              <h2>Lista de espera</h2>
            </div>

            <div className="espera-list">
              {datos_seguros.listaEsperaItems.map((item, idx) => (
                <div key={item?.id || idx} className="espera-item">
                  <div className="espera-numero">{idx + 1}</div>
                  <div className="espera-detalle">
                    <div className="espera-nombre">{item?.nombre || 'Sin nombre'}</div>
                    <div className="espera-servicio">{item?.servicio || 'Sin servicio'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
