import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVendedorAuth } from '../../context/VendedorAuthContext';
import { fetchProspectosDemo, eliminarProspectoDemo } from '../../api/client';

function formatearFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function MisDemos() {
  const { token } = useVendedorAuth();
  const navigate = useNavigate();

  const [demos, setDemos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [eliminandoId, setEliminandoId] = useState(null);

  function cargar() {
    setCargando(true);
    fetchProspectosDemo(token)
      .then((data) => setDemos(data.demos || []))
      .catch((err) => setError(err.message || 'No se pudo cargar el listado'))
      .finally(() => setCargando(false));
  }

  useEffect(() => { cargar(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function manejarEliminar(demo) {
    const confirmado = window.confirm(
      `¿Eliminar la demo de "${demo.nombreNegocio}" (${demo.telefono})? El teléfono queda libre de inmediato para una demo nueva — el historial se conserva internamente para reportes futuros.`
    );
    if (!confirmado) return;

    setEliminandoId(demo.id);
    setError('');
    try {
      await eliminarProspectoDemo(token, demo.id);
      setDemos((prev) => prev.filter((d) => d.id !== demo.id));
    } catch (err) {
      setError(err.message || 'No se pudo eliminar la demo');
    } finally {
      setEliminandoId(null);
    }
  }

  return (
    <div className="pantalla-vendedor">
      <h1>Mis demos</h1>

      <button className="boton-secundario" onClick={() => navigate('/vendedor/nueva-demo')}>
        + Nueva demo
      </button>

      {cargando && <p>Cargando…</p>}
      {error && <p className="login-error">{error}</p>}

      {!cargando && demos.length === 0 && (
        <p className="texto-ayuda">Aún no has cargado ninguna demo.</p>
      )}

      <ul className="lista-demos">
        {demos.map((d) => (
          <li key={d.id} className="tarjeta-demo">
            <div className="tarjeta-demo-header">
              <strong>{d.nombreNegocio}</strong>
              <span className={d.yaProbo ? 'badge-exito' : 'badge-pendiente'}>
                {d.yaProbo ? '✅ Ya probó' : '⏳ Aún no ha llamado'}
              </span>
            </div>
            <p>{d.nombreEncargado} · {d.telefono}</p>
            <p className="texto-ayuda">{d.rubro}</p>
            <p className="texto-ayuda">
              Cargada: {formatearFecha(d.creadoEn)}
              {d.yaProbo && ` · Última actividad: ${formatearFecha(d.ultimaActividadEn)}`}
            </p>
            <button
              className="btn-link btn-danger"
              onClick={() => manejarEliminar(d)}
              disabled={eliminandoId === d.id}
            >
              {eliminandoId === d.id ? 'Eliminando…' : 'Eliminar'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}