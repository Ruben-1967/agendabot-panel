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

function TarjetaCliente({ cliente: c, expandido, onToggle, onMarcarPagado, procesando }) {
  const estado = ETIQUETA_ESTADO[c.estado] || { texto: c.estado, clase: 'badge-pendiente' };

  return (
    <div className="tarjeta-vendedor-admin-wrap">
      <div className="tarjeta-vendedor-admin" onClick={onToggle} role="button" tabIndex={0}>
        <div className="tarjeta-vendedor-admin-info">
          <strong>{c.empresaNombre}</strong>
          <span className="texto-muted">{c.telefonoContacto || 'Sin teléfono'} · {c.plan}</span>
        </div>
        <div className="tarjeta-vendedor-admin-derecha">
          <span className={estado.clase}>{estado.texto}</span>
          <span className="btn-link">{expandido ? 'Ocultar' : 'Ver más'}</span>
        </div>
      </div>
      {expandido && (
        <div className="detalle-vendedor-admin">
          <h3 className="subtitulo-tarjeta">Datos</h3>
          <p className="texto-ayuda" style={{ margin: '0 0 4px' }}>Vendedor: {c.vendedorNombre || '—'}</p>
          <p className="texto-ayuda" style={{ margin: '0 0 4px' }}>Monto mensual: ${c.montoMensualActual?.toLocaleString('es-CL')}</p>
          <p className="texto-ayuda" style={{ margin: '0 0 4px' }}>Desde: {formatFecha(c.fechaInicio)}</p>
          {c.estado === 'ACTIVA' && (
            <p className="texto-ayuda" style={{ marginBottom: 16 }}>Activo desde: {formatFecha(c.fechaActivacion)}</p>
          )}
          {c.estado === 'PENDIENTE_PAGO' && (
            <p className="texto-ayuda" style={{ marginBottom: 16 }}>Días sin pago: {c.diasSinPago}</p>
          )}

          {c.estado === 'PENDIENTE_PAGO' && (
            <button
              type="button"
              className="cta-secundaria"
              onClick={(e) => { e.stopPropagation(); onMarcarPagado(c); }}
              disabled={procesando}
            >
              {procesando ? 'Marcando…' : 'Marcar como pagado'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function Clientes() {
  const { token } = useVendedorAuth();
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [procesandoId, setProcesandoId] = useState(null);
  const [expandidoId, setExpandidoId] = useState(null);
  const [filtro, setFiltro] = useState('todos'); // 'todos' | 'ACTIVA' | 'PENDIENTE_PAGO'

  function cargar() {
    setCargando(true);
    fetchSuscripciones(token)
      .then((data) => setClientes(data.clientes || []))
      .catch((err) => setError(err.message || 'No se pudo cargar el listado'))
      .finally(() => setCargando(false));
  }

  useEffect(() => { cargar(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function manejarMarcar(cliente) {
    const confirmado = window.confirm(`¿Confirmar que "${cliente.empresaNombre}" ya pagó y activar su plan? Esto queda contado en el ranking de conversión del mes.`);
    if (!confirmado) return;

    setProcesandoId(cliente.empresaId);
    setError('');
    try {
      await marcarSuscripcionActiva(token, cliente.empresaId);
      setClientes((prev) => prev.map((c) => (c.empresaId === cliente.empresaId ? { ...c, estado: 'ACTIVA' } : c)));
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
          <div className="lista-vendedores-admin">
            {clientesFiltrados.map((c) => (
              <TarjetaCliente
                key={c.empresaId}
                cliente={c}
                expandido={expandidoId === c.empresaId}
                onToggle={() => setExpandidoId(expandidoId === c.empresaId ? null : c.empresaId)}
                onMarcarPagado={manejarMarcar}
                procesando={procesandoId === c.empresaId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
