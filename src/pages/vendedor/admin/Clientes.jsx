import { useEffect, useState } from 'react';
import { useVendedorAuth } from '../../../context/VendedorAuthContext';
import { fetchSuscripciones, marcarSuscripcionActiva } from '../../../api/client';
import NavVendedor from '../NavVendedor';
import '../vendedor.css';

function formatFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}

const ETIQUETA_ESTADO = {
  ACTIVA: { texto: 'Activo', clase: 'badge-exito' },
  PENDIENTE_PAGO: { texto: 'Pendiente de pago', clase: 'badge-pendiente' },
};

export default function Clientes() {
  const { token } = useVendedorAuth();
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [procesandoId, setProcesandoId] = useState(null);
  const [filtro, setFiltro] = useState('todos'); // 'todos' | 'ACTIVA' | 'PENDIENTE_PAGO'

  function cargar() {
    setCargando(true);
    fetchSuscripciones(token)
      .then((data) => setClientes(data.clientes || []))
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
      setClientes((prev) => prev.map((c) => (c.empresaId === empresaId ? { ...c, estado: 'ACTIVA' } : c)));
    } catch (err) {
      setError(err.message || 'No se pudo activar la suscripción');
    } finally {
      setProcesandoId(null);
    }
  }

  const clientesFiltrados = filtro === 'todos' ? clientes : clientes.filter((c) => c.estado === filtro);
  const totalActivos = clientes.filter((c) => c.estado === 'ACTIVA').length;
  const totalPendientes = clientes.filter((c) => c.estado === 'PENDIENTE_PAGO').length;

  return (
    <div className="pantalla-vendedor">
      <NavVendedor />
      <div className="vendedor-inner">
        <h1>Clientes</h1>
        <p className="texto-ayuda">
          Todos los negocios con una suscripción real, activos o pendientes de confirmar el pago.
          Mientras el cobro se coordina fuera del sistema (transferencia, efectivo, etc.), marca acá
          manualmente cuando un cliente ya pagó — eso es lo que cuenta como conversión en el ranking.
        </p>

        <div className="pestanas-filtro" style={{ marginBottom: 16 }}>
          <button type="button" className={filtro === 'todos' ? 'pestana-filtro activa' : 'pestana-filtro'} onClick={() => setFiltro('todos')}>
            Todos ({clientes.length})
          </button>
          <button type="button" className={filtro === 'ACTIVA' ? 'pestana-filtro activa' : 'pestana-filtro'} onClick={() => setFiltro('ACTIVA')}>
            Activos ({totalActivos})
          </button>
          <button type="button" className={filtro === 'PENDIENTE_PAGO' ? 'pestana-filtro activa' : 'pestana-filtro'} onClick={() => setFiltro('PENDIENTE_PAGO')}>
            Pendientes de pago ({totalPendientes})
          </button>
        </div>

        {error && <p className="login-error">{error}</p>}
        {cargando && <p>Cargando…</p>}
        {!cargando && clientesFiltrados.length === 0 && <p className="texto-ayuda">No hay clientes en esta vista.</p>}

        {!cargando && clientesFiltrados.length > 0 && (
          <table className="tabla-admin-vendedor">
            <thead>
              <tr><th>Empresa</th><th>Estado</th><th>Vendedor</th><th>Plan</th><th>Monto</th><th>Desde</th><th>Días sin pago</th><th></th></tr>
            </thead>
            <tbody>
              {clientesFiltrados.map((c) => {
                const estado = ETIQUETA_ESTADO[c.estado] || { texto: c.estado, clase: 'badge-pendiente' };
                return (
                  <tr key={c.empresaId}>
                    <td>{c.empresaNombre}<br /><span className="texto-ayuda">{c.telefonoContacto}</span></td>
                    <td><span className={estado.clase}>{estado.texto}</span></td>
                    <td>{c.vendedorNombre || '—'}</td>
                    <td>{c.plan}</td>
                    <td>${c.montoMensualActual?.toLocaleString('es-CL')}</td>
                    <td>{formatFecha(c.fechaInicio)}</td>
                    <td>{c.diasSinPago ?? '—'}</td>
                    <td>
                      {c.estado === 'PENDIENTE_PAGO' && (
                        <button
                          className="cta-secundaria"
                          onClick={() => manejarMarcar(c.empresaId, c.empresaNombre)}
                          disabled={procesandoId === c.empresaId}
                        >
                          {procesandoId === c.empresaId ? 'Marcando…' : 'Marcar como pagado'}
                        </button>
                      )}
                    </td>
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
