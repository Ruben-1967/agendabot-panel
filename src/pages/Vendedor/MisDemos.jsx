import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVendedorAuth } from '../../context/VendedorAuthContext';
import { fetchProspectosDemo } from '../../api/client';

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

  useEffect(() => {
    fetchProspectosDemo(token)
      .then((data) => setDemos(data.demos || []))
      .catch((err) => setError(err.message || 'No se pudo cargar el listado'))
      .finally(() => setCargando(false));
  }, [token]);

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
          </li>
        ))}
      </ul>
    </div>
  );
}