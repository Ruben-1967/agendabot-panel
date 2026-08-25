import { useEffect, useState } from 'react';
import { useVendedorAuth } from '../../context/VendedorAuthContext';
import { fetchReporteOrigenCaso } from '../../api/client';
import NavVendedor from './NavVendedor';
import './vendedor.css';

export default function ReporteOrigenCaso() {
  const { token, vendedor } = useVendedorAuth();
  const esAdmin = vendedor?.rol === 'ADMIN';
  const [reporte, setReporte] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setCargando(true);
    fetchReporteOrigenCaso(token)
      .then((data) => setReporte(data.reporte || []))
      .catch((err) => setError(err.message || 'No se pudo cargar el reporte'))
      .finally(() => setCargando(false));
  }, [token]);

  const totalHeredado = reporte.reduce((acc, f) => acc + f.heredado, 0);
  const totalOrganico = reporte.reduce((acc, f) => acc + f.organico, 0);

  return (
    <div className="pantalla-vendedor">
      <NavVendedor />
      <div className="vendedor-inner">
        <h1>Heredado vs. orgánico</h1>
        <p className="texto-ayuda">
          {esAdmin
            ? 'Casos convertidos y con pago confirmado, por vendedor — heredado (venían del pool) vs. orgánico (esfuerzo propio del vendedor). Base para el cálculo de bonos.'
            : 'Tus casos convertidos y con pago confirmado — heredado (vinieron del pool) vs. orgánico (los conseguiste tú).'}
        </p>

        {error && <p className="login-error">{error}</p>}
        {cargando && <p>Cargando…</p>}

        {!cargando && reporte.length === 0 && (
          <p className="texto-ayuda">Todavía no hay casos convertidos con pago confirmado.</p>
        )}

        {!cargando && reporte.length > 0 && (
          <table className="tabla-admin-vendedor">
            <thead>
              <tr>
                {esAdmin && <th>Vendedor</th>}
                <th>Heredado</th>
                <th>Orgánico</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {reporte.map((fila) => (
                <tr key={fila.vendedorId}>
                  {esAdmin && <td>{fila.nombre || '—'}</td>}
                  <td>{fila.heredado}</td>
                  <td>{fila.organico}</td>
                  <td>{fila.heredado + fila.organico}</td>
                </tr>
              ))}
            </tbody>
            {esAdmin && reporte.length > 1 && (
              <tfoot>
                <tr>
                  <td><strong>Total equipo</strong></td>
                  <td><strong>{totalHeredado}</strong></td>
                  <td><strong>{totalOrganico}</strong></td>
                  <td><strong>{totalHeredado + totalOrganico}</strong></td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  );
}
