import { useEffect, useState } from 'react';
import { useVendedorAuth } from '../../../context/VendedorAuthContext';
import { fetchSuscripcionesPendientes, marcarSuscripcionActiva } from '../../../api/client';
import NavVendedor from '../NavVendedor';
import '../vendedor.css';

function formatFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MarcarPagos() {
  const { token } = useVendedorAuth();
  const [pendientes, setPendientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [procesandoId, setProcesandoId] = useState(null);

  function cargar() {
    setCargando(true);
    fetchSuscripcionesPendientes(token)
      .then((data) => setPendientes(data.pendientes || []))
      .catch((err) => setError(err.message || 'No se pudo cargar el listado'))
      .finally(() => setCargando(false));
  }

  useEffect(() => { cargar(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function manejarMarcar(empresaId, nombre) {
    const confirmado = window.confirm(`¿Confirmar que "${nombre}" ya pagó y activar su plan? Esto queda contado en el ranking de conversión del mes.`);
    if (!confirmado) return;

    setProcesandoId(empresaId);
    setError('');
    try {
      await marcarSuscripcionActiva(token, empresaId);
      setPendientes((prev) => prev.filter((p) => p.empresaId !== empresaId));
    } catch (err) {
      setError(err.message || 'No se pudo activar la suscripción');
    } finally {
      setProcesandoId(null);
    }
  }

  return (
    <div className="pantalla-vendedor">
      <NavVendedor />
      <div className="vendedor-inner">
        <h1>Pagos pendientes de confirmar</h1>
        <p className="texto-ayuda">
          Mientras el cobro real se coordina fuera del sistema (transferencia, efectivo, etc.), marca acá manualmente
          cuando un cliente ya pagó para activar su plan. Esto es lo que cuenta como conversión en el ranking.
        </p>

        {error && <p className="login-error">{error}</p>}
        {cargando && <p>Cargando…</p>}
        {!cargando && pendientes.length === 0 && <p className="texto-ayuda">No hay pagos pendientes de confirmar.</p>}

        {!cargando && pendientes.length > 0 && (
          <table className="tabla-admin-vendedor">
            <thead>
              <tr><th>Empresa</th><th>Vendedor</th><th>Plan</th><th>Monto</th><th>Desde</th><th>Días sin pago</th><th></th></tr>
            </thead>
            <tbody>
              {pendientes.map((p) => (
                <tr key={p.empresaId}>
                  <td>{p.empresaNombre}<br /><span className="texto-ayuda">{p.telefonoContacto}</span></td>
                  <td>{p.vendedorNombre || '—'}</td>
                  <td>{p.plan}</td>
                  <td>${p.montoMensualActual?.toLocaleString('es-CL')}</td>
                  <td>{formatFecha(p.fechaInicio)}</td>
                  <td>{p.diasSinPago}</td>
                  <td>
                    <button
                      className="cta-secundaria"
                      onClick={() => manejarMarcar(p.empresaId, p.empresaNombre)}
                      disabled={procesandoId === p.empresaId}
                    >
                      {procesandoId === p.empresaId ? 'Marcando…' : 'Marcar como pagado'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
