import { useEffect, useState } from 'react';
import { useVendedorAuth } from '../../context/VendedorAuthContext';
import { fetchRankingActual } from '../../api/client';
import NavVendedor from './NavVendedor';
import './vendedor.css';

function formatearHora(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

export default function Ranking() {
  const { token } = useVendedorAuth();
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRankingActual(token)
      .then(setData)
      .catch((err) => setError(err.message || 'No se pudo cargar el ranking'))
      .finally(() => setCargando(false));
  }, [token]);

  const progreso = data ? Math.round((data.progresoMetaGrupal || 0) * 100) : 0;

  return (
    <div className="pantalla-vendedor">
      <NavVendedor />
      <div className="vendedor-inner">
        <h1>Ranking del mes</h1>

        {error && <p className="login-error">{error}</p>}
        {cargando && <p>Cargando…</p>}

        {!cargando && data && (
          <>
            <div className="ranking-resumen">
              <p>
                {data.totalConversionesEquipo} de {data.metaMinimaGrupalMensual} ventas del equipo este mes
                {data.diasRestantesDelMes != null && ` · quedan ${data.diasRestantesDelMes} día${data.diasRestantesDelMes === 1 ? '' : 's'}`}
              </p>
              <div className="ranking-barra-meta">
                <div className="ranking-barra-meta-relleno" style={{ width: `${Math.min(100, progreso)}%` }} />
              </div>
              {data.totalConversionesEquipo < data.metaMinimaGrupalMensual && (
                <p className="texto-ayuda" style={{ marginTop: 8, marginBottom: 0 }}>
                  Si no se alcanza la meta grupal antes de fin de mes, no se entregan premios (el ranking igual se sigue mostrando).
                </p>
              )}
              {data.actualizadoEn && (
                <p className="ranking-actualizado">Última actualización: {formatearHora(data.actualizadoEn)}</p>
              )}
            </div>

            {data.posiciones.length === 0 ? (
              <p className="texto-ayuda">Todavía no hay conversiones este mes.</p>
            ) : (
              <ul className="podio-lista">
                {data.posiciones.map((p) => (
                  <li key={p.vendedorId} className={`podio-fila ${p.posicion <= 3 ? `puesto-${p.posicion}` : ''}`}>
                    <span className="podio-posicion">{p.posicion}°</span>
                    <span className="podio-nombre">{p.nombre}</span>
                    <span className="podio-conversiones">{p.conversiones} {p.conversiones === 1 ? 'conversión' : 'conversiones'}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
