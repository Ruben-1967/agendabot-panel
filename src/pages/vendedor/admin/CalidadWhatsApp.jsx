import { useEffect, useState } from 'react';
import { useVendedorAuth } from '../../../context/VendedorAuthContext';
import { fetchCalidadWhatsApp } from '../../../api/client';
import NavVendedor from '../NavVendedor';
import '../vendedor.css';

const ETIQUETA_CALIDAD = {
  GREEN: { texto: 'Buena', clase: 'badge-sla-ok' },
  YELLOW: { texto: 'Media', clase: 'badge-sla-amarillo' },
  RED: { texto: 'Baja — riesgo de bloqueo', clase: 'badge-sla-rojo' },
};

export default function CalidadWhatsApp() {
  const { token } = useVendedorAuth();
  const [reporte, setReporte] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  function cargar() {
    setCargando(true);
    setError('');
    fetchCalidadWhatsApp(token)
      .then((data) => setReporte(data.reporte || []))
      .catch((err) => setError(err.message || 'No se pudo cargar el reporte'))
      .finally(() => setCargando(false));
  }

  useEffect(() => { cargar(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pantalla-vendedor">
      <NavVendedor />
      <div className="vendedor-inner">
        <h1>Calidad de WhatsApp</h1>
        <p className="texto-ayuda">
          Calificación de calidad de Meta (últimos 7 días, según bloqueos y reportes de los usuarios) para cada
          negocio con WhatsApp conectado — señal temprana antes de que Meta llegue a bloquear el número.
        </p>

        {error && <p className="login-error">{error}</p>}
        {cargando && <p>Cargando…</p>}
        {!cargando && (
          <button className="btn-link" onClick={cargar} style={{ marginBottom: 12 }}>Actualizar</button>
        )}
        {!cargando && reporte.length === 0 && (
          <p className="texto-ayuda">Ningún negocio tiene WhatsApp conectado todavía.</p>
        )}

        {!cargando && reporte.length > 0 && (
          <table className="tabla-admin-vendedor">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Número</th>
                <th>Calidad</th>
                <th>Límite de mensajería</th>
              </tr>
            </thead>
            <tbody>
              {reporte.map((r) => {
                const calidad = r.qualityRating ? ETIQUETA_CALIDAD[r.qualityRating] : null;
                return (
                  <tr key={r.empresaId}>
                    <td>{r.empresaNombre}</td>
                    <td>{r.whatsappPhoneNumber || '—'}</td>
                    <td>
                      {r.error ? (
                        <span className="texto-ayuda">Error al consultar: {r.error}</span>
                      ) : calidad ? (
                        <span className={`badge-sla ${calidad.clase}`}>{calidad.texto}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{r.limiteMensajeria || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
