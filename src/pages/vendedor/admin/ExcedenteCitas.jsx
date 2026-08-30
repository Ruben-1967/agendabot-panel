import { useEffect, useState } from 'react';
import { useVendedorAuth } from '../../../context/VendedorAuthContext';
import { fetchExcedenteCitas } from '../../../api/client';
import NavVendedor from '../NavVendedor';
import '../vendedor.css';

function formatFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatoCLP(n) {
  if (n == null) return '—';
  return `$${n.toLocaleString('es-CL')}`;
}

export default function ExcedenteCitas() {
  const { token } = useVendedorAuth();
  const [reporte, setReporte] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  function cargar() {
    setCargando(true);
    setError('');
    fetchExcedenteCitas(token)
      .then((data) => setReporte(data.reporte || []))
      .catch((err) => setError(err.message || 'No se pudo cargar el reporte'))
      .finally(() => setCargando(false));
  }

  useEffect(() => { cargar(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pantalla-vendedor">
      <NavVendedor />
      <div className="vendedor-inner">
        <h1>Excedente de citas</h1>
        <p className="texto-ayuda">
          Empresas activas que superaron las citas incluidas en su plan durante el ciclo de facturación en curso.
          Esto es solo informativo — no cobra nada automáticamente, el cobro por excedente se coordina a mano
          mientras se valida el conteo.
        </p>

        {error && <p className="login-error">{error}</p>}
        {cargando && <p>Cargando…</p>}
        {!cargando && (
          <button className="btn-link" onClick={cargar} style={{ marginBottom: 12 }}>Actualizar</button>
        )}
        {!cargando && reporte.length === 0 && (
          <p className="texto-ayuda">Ninguna empresa activa se pasó de su cupo de citas este ciclo.</p>
        )}

        {!cargando && reporte.length > 0 && (
          <table className="tabla-admin-vendedor">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Plan</th>
                <th>Citas del ciclo</th>
                <th>Incluidas</th>
                <th>Exceso</th>
                <th>Precio/cita</th>
                <th>Monto sugerido</th>
                <th>Ciclo desde</th>
              </tr>
            </thead>
            <tbody>
              {reporte.map((r) => (
                <tr key={r.empresaId}>
                  <td>{r.nombreEmpresa}</td>
                  <td>{r.plan}</td>
                  <td>{r.citasDelCiclo}</td>
                  <td>{r.citasIncluidas}</td>
                  <td>{r.exceso}</td>
                  <td>{formatoCLP(r.precioCitaExcedente)}</td>
                  <td><strong>{formatoCLP(r.montoSugerido)}</strong></td>
                  <td>{formatFecha(r.inicioCiclo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
