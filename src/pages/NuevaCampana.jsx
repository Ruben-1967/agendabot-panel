// src/pages/NuevaCampana.jsx
//
// AJUSTAR AL INTEGRAR:
// - La forma de llamar a la API (acá uso fetch directo con VITE_API_URL + token de localStorage,
//   como patrón genérico de Vite — si ya tienes un apiClient centralizado, reemplaza fetchApi() por eso)
// - El rol/permiso: asumí que cualquiera con acceso al panel de campañas puede ver esta pantalla
// - El id de campaña y de empresa: acá los tomo de props/params, ajusta según tu router (React Router)

import { useState, useEffect, useCallback, useMemo } from 'react';
import './NuevaCampana.css';

const API_URL = import.meta.env.VITE_API_URL;
const PRECIO_CREDITO = 149;
const MINIMO_COMPRA = 50;
const LIMITE_MENSAJE_DIA = 80;

function fetchApi(path, options = {}) {
  const token = localStorage.getItem('token'); // AJUSTAR: como sea que guardes el token de sesión
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || 'Error de red');
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  });
}

function fmt(n) {
  return '$' + n.toLocaleString('es-CL');
}

function lastBuyLabel(dias) {
  if (dias === null) return 'Nunca';
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  return `${dias} días atrás`;
}

export default function NuevaCampana({ campanaId }) {
  const [clientes, setClientes] = useState([]);
  const [cargandoClientes, setCargandoClientes] = useState(true);
  const [productos, setProductos] = useState([]);
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [mensajeDia, setMensajeDia] = useState('');
  const [saldoActual, setSaldoActual] = useState(0);
  const [cargandoSaldo, setCargandoSaldo] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState(null);

  const [filtros, setFiltros] = useState({
    montoMinimo: '',
    minPedidos: '',
    productoId: '',
    diasSinComprar: '',
  });

  const [compraRapidaQty, setCompraRapidaQty] = useState(MINIMO_COMPRA);
  const [comprando, setComprando] = useState(false);

  // ---- carga inicial: segmentación de clientes ----
  const cargarClientes = useCallback(async (filtrosActivos = {}) => {
    setCargandoClientes(true);
    try {
      const params = new URLSearchParams();
      if (filtrosActivos.montoMinimo) params.set('montoMinimo', filtrosActivos.montoMinimo);
      if (filtrosActivos.minPedidos) params.set('minPedidos', filtrosActivos.minPedidos);
      if (filtrosActivos.productoId) params.set('productoId', filtrosActivos.productoId);
      if (filtrosActivos.diasSinComprar) params.set('diasSinComprar', filtrosActivos.diasSinComprar);

      const data = await fetchApi(`/clientes/segmentacion?${params.toString()}`);
      setClientes(data.clientes || []);
    } catch (err) {
      console.error('Error cargando clientes:', err);
    } finally {
      setCargandoClientes(false);
    }
  }, []);

  // ---- carga inicial: saldo de créditos ----
  const cargarSaldo = useCallback(async () => {
    setCargandoSaldo(true);
    try {
      const data = await fetchApi('/billetera');
      setSaldoActual(data.saldoActual || 0);
    } catch (err) {
      console.error('Error cargando saldo:', err);
    } finally {
      setCargandoSaldo(false);
    }
  }, []);

  // ---- carga inicial: catálogo de productos (para el filtro) ----
  const cargarProductos = useCallback(async () => {
    try {
      const data = await fetchApi('/productos');
      // AJUSTAR: el nombre del campo puede variar según cómo devuelva tu endpoint /productos
      // (ej. data.productos vs data directamente como array)
      setProductos(data.productos || data || []);
    } catch (err) {
      console.error('Error cargando productos:', err);
    }
  }, []);

  useEffect(() => {
    cargarClientes(); // sin filtros al entrar: se ve toda la cartera
    cargarSaldo();
    cargarProductos();
  }, [cargarClientes, cargarSaldo, cargarProductos]);

  // ---- selección ----
  const toggleCliente = (clienteId) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(clienteId)) next.delete(clienteId);
      else next.add(clienteId);
      return next;
    });
  };

  const marcarTodosVisibles = (valor) => {
    setSeleccionados(valor ? new Set(clientes.map((c) => c.clienteId)) : new Set());
  };

  const aplicarFiltrosYMarcar = async () => {
    await cargarClientes(filtros);
    // Tras filtrar, el backend ya devuelve solo los que cumplen — los marcamos todos por defecto
    setSeleccionados(new Set());
  };

  const limpiarFiltros = () => {
    setFiltros({ montoMinimo: '', minPedidos: '', productoId: '', diasSinComprar: '' });
    cargarClientes({});
    setSeleccionados(new Set());
  };

  // ---- cálculos derivados ----
  const seleccionadosCount = seleccionados.size;
  const saldoDespues = saldoActual - seleccionadosCount;
  const saldoInsuficiente = seleccionadosCount > saldoActual;
  const faltantes = Math.max(0, seleccionadosCount - saldoActual);

  const totalCompraRapida = useMemo(() => compraRapidaQty * PRECIO_CREDITO, [compraRapidaQty]);

  // Cuando aparece el déficit, pre-cargamos la cantidad sugerida (redondeada al mínimo)
  useEffect(() => {
    if (saldoInsuficiente) {
      setCompraRapidaQty(Math.max(MINIMO_COMPRA, faltantes));
    }
  }, [saldoInsuficiente, faltantes]);

  // ---- compra rápida de créditos ----
  const comprarCreditos = async () => {
    if (compraRapidaQty < MINIMO_COMPRA) return;
    setComprando(true);
    try {
      const data = await fetchApi('/billetera/comprar', {
        method: 'POST',
        body: JSON.stringify({ cantidadCreditos: compraRapidaQty }),
      });
      // AJUSTAR: acá rediriges a data.urlPago (la URL real de Flow.cl) en vez de solo recargar el saldo.
      // window.location.href = data.urlPago;
      alert('Te llevaría a pagar en Flow.cl. Cuando Flow confirme el pago, el saldo se actualiza solo.');
    } catch (err) {
      alert(err.data?.error || 'Error al iniciar la compra de créditos');
    } finally {
      setComprando(false);
    }
  };

  // ---- envío de campaña ----
  const enviarCampana = async () => {
    if (seleccionadosCount === 0 || saldoInsuficiente) return;
    setEnviando(true);
    setErrorEnvio(null);
    try {
      const data = await fetchApi(`/campanas/${campanaId}/enviar`, {
        method: 'POST',
        body: JSON.stringify({
          clienteIds: Array.from(seleccionados),
          mensajeDelDia: mensajeDia || undefined,
        }),
      });
      alert(`Campaña enviada a ${data.enviados} clientes. Saldo restante: ${data.saldoRestante} créditos.`);
      setSaldoActual(data.saldoRestante);
      setSeleccionados(new Set());
    } catch (err) {
      if (err.status === 402) {
        // El backend revalida el saldo en la transacción — si llegó a pasar esto,
        // significa que otro envío consumió el saldo justo antes que este.
        setErrorEnvio('Saldo insuficiente al momento de confirmar. Actualiza el saldo e inténtalo de nuevo.');
        cargarSaldo();
      } else {
        setErrorEnvio(err.data?.error || 'Error al enviar la campaña');
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="nc-wrap">
      <div className="nc-page-head">
        <div>
          <p className="nc-eyebrow">Campaña de hoy</p>
          <h1>Elige a quién le llega y qué dice</h1>
          <p className="nc-sub">
            Filtra la audiencia, revisa el mensaje del día, y confirma. El costo se descuenta de tus créditos al enviar.
          </p>
        </div>
        <div className="nc-credits-pill">
          <div>
            <span className="nc-pill-n">{cargandoSaldo ? '—' : saldoActual}</span>
            <span className="nc-pill-l">créditos</span>
          </div>
          <button onClick={() => document.getElementById('nc-quickbuy')?.scrollIntoView({ behavior: 'smooth' })}>
            + Comprar
          </button>
        </div>
      </div>

      {/* Mensaje del día */}
      <div className="nc-mensaje-dia">
        <label htmlFor="mensajeDia">Mensaje del día (opcional)</label>
        <textarea
          id="mensajeDia"
          maxLength={LIMITE_MENSAJE_DIA}
          placeholder="ej. ¡Hoy tenemos algo especial para el Día del Café!"
          value={mensajeDia}
          onChange={(e) => setMensajeDia(e.target.value)}
        />
        <p className={`nc-counter ${mensajeDia.length >= 75 ? 'over' : ''}`}>
          {mensajeDia.length} / {LIMITE_MENSAJE_DIA}
        </p>
      </div>

      {/* Filtros */}
      <div className="nc-filters">
        <div className="nc-filters-head">Filtrar clientes</div>
        <div className="nc-filters-grid">
          <div className="nc-field">
            <label>Gastó al menos (CLP, últimos 30 días)</label>
            <input
              type="number"
              min="0"
              step="1000"
              value={filtros.montoMinimo}
              onChange={(e) => setFiltros((f) => ({ ...f, montoMinimo: e.target.value }))}
            />
          </div>
          <div className="nc-field">
            <label>Mínimo de pedidos (últimos 30 días)</label>
            <input
              type="number"
              min="0"
              value={filtros.minPedidos}
              onChange={(e) => setFiltros((f) => ({ ...f, minPedidos: e.target.value }))}
            />
          </div>
          <div className="nc-field">
            <label>Compró este producto</label>
            <select
              value={filtros.productoId}
              onChange={(e) => setFiltros((f) => ({ ...f, productoId: e.target.value }))}
            >
              <option value="">Cualquiera</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="nc-field">
            <label>Sin comprar hace más de</label>
            <select
              value={filtros.diasSinComprar}
              onChange={(e) => setFiltros((f) => ({ ...f, diasSinComprar: e.target.value }))}
            >
              <option value="">No aplicar</option>
              <option value="14">14 días</option>
              <option value="21">21 días</option>
              <option value="30">30 días</option>
            </select>
          </div>
        </div>
        <div className="nc-filters-actions">
          <button className="nc-btn primary" onClick={aplicarFiltrosYMarcar}>
            Aplicar filtros
          </button>
          <button className="nc-btn" onClick={limpiarFiltros}>
            Limpiar filtros
          </button>
          <button className="nc-btn ghost" onClick={() => marcarTodosVisibles(false)}>
            Desmarcar todos
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="nc-table-card">
        {cargandoClientes ? (
          <p className="nc-loading">Cargando clientes…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th className="chk">
                  <input
                    type="checkbox"
                    checked={clientes.length > 0 && seleccionadosCount === clientes.length}
                    onChange={(e) => marcarTodosVisibles(e.target.checked)}
                  />
                </th>
                <th>Cliente</th>
                <th className="num">Pedidos (30d)</th>
                <th className="num">Gastado (30d)</th>
                <th>Producto favorito</th>
                <th>Última compra</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => {
                const stale = c.diasDesdeUltimaCompra !== null && c.diasDesdeUltimaCompra >= 21;
                return (
                  <tr key={c.clienteId} className={seleccionados.has(c.clienteId) ? 'row-selected' : ''}>
                    <td className="chk">
                      <input
                        type="checkbox"
                        checked={seleccionados.has(c.clienteId)}
                        onChange={() => toggleCliente(c.clienteId)}
                      />
                    </td>
                    <td>
                      <div className="nc-cli-name">{c.nombre}</div>
                      <div className="nc-cli-phone">{c.telefono}</div>
                    </td>
                    <td className="num">{c.numPedidos}</td>
                    <td className="num">{fmt(c.totalGastado)}</td>
                    <td>{c.productoTopNombre ? <span className="nc-tag">{c.productoTopNombre}</span> : '—'}</td>
                    <td className={`nc-last-buy ${stale ? 'stale' : ''}`}>
                      {lastBuyLabel(c.diasDesdeUltimaCompra)}
                    </td>
                  </tr>
                );
              })}
              {clientes.length === 0 && (
                <tr>
                  <td colSpan={6} className="nc-empty">
                    Ningún cliente cumple estos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Barra inferior fija */}
      <div className="nc-summary-bar">
        <div className="nc-summary-top">
          <div className="nc-summary-left">
            <div className="nc-summary-stat">
              <span className="n">{seleccionadosCount}</span>
              <span className="l">Seleccionados</span>
            </div>
            <div className="nc-summary-stat">
              <span className="n">{seleccionadosCount}</span>
              <span className="l">Créditos necesarios</span>
            </div>
            <div className="nc-summary-stat">
              <span className={`n ${saldoDespues < 0 ? 'warn' : ''}`}>{saldoDespues}</span>
              <span className="l">Saldo después del envío</span>
            </div>
          </div>
          <button
            className="nc-btn brass"
            onClick={enviarCampana}
            disabled={enviando || saldoInsuficiente || seleccionadosCount === 0}
          >
            {enviando ? 'Enviando…' : 'Enviar campaña →'}
          </button>
        </div>

        {errorEnvio && <p className="nc-error-envio">{errorEnvio}</p>}

        {saldoInsuficiente && (
          <div className="nc-insufficient-box" id="nc-quickbuy">
            <span className="nc-insufficient-msg">Te faltan {faltantes} créditos para este envío.</span>
            <div className="nc-quick-buy">
              <input
                type="number"
                min={MINIMO_COMPRA}
                step={10}
                value={compraRapidaQty}
                onChange={(e) => setCompraRapidaQty(parseInt(e.target.value) || 0)}
              />
              <span className="nc-price">{fmt(totalCompraRapida)} CLP</span>
              <button className="nc-btn brass" onClick={comprarCreditos} disabled={comprando}>
                {comprando ? 'Procesando…' : 'Comprar y continuar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
