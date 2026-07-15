import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchPedidosHoy, actualizarEstadoPedido } from '../../api/client';

const ESTADOS = ['PENDIENTE', 'CONFIRMADO', 'LISTO', 'ENTREGADO', 'CANCELADO'];

export default function PedidosHoy() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  async function cargar() {
    try {
      const resultado = await fetchPedidosHoy(token);
      setData(resultado);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function cambiarEstado(pedidoId, estado) {
    try {
      await actualizarEstadoPedido(token, pedidoId, estado);
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  if (cargando) return <p className="texto-muted">Cargando…</p>;
  if (error) return <p className="mensaje-error">{error}</p>;
  if (!data) return null;

  return (
    <div>
      <h1>Pedidos de hoy</h1>
      <p className="pagina-sub">{data.totalPedidos} pedido(s) · total ${data.totalGeneral}</p>

      <h2 className="subtitulo">Cuánto preparar</h2>
      {data.consolidadoPorProducto.length === 0 ? (
        <p className="texto-muted">Todavía no hay pedidos hoy.</p>
      ) : (
        <table className="tabla-simple">
          <thead><tr><th>Producto</th><th>Cantidad total</th></tr></thead>
          <tbody>
            {data.consolidadoPorProducto.map((p) => (
              <tr key={p.nombre}>
                <td>{p.nombre}</td>
                <td>{p.cantidadTotal} {p.unidad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className="subtitulo">Detalle por cliente</h2>
      {data.pedidos.length === 0 ? (
        <p className="texto-muted">Sin pedidos todavía.</p>
      ) : (
        <div className="lista-pedidos">
          {data.pedidos.map((p) => (
            <div key={p.id} className="tarjeta-pedido">
              <div className="tarjeta-pedido-head">
                <div>
                  <strong>{p.cliente.nombre}</strong>
                  <span className="texto-muted"> · {p.cliente.telefono}</span>
                </div>
                <select value={p.estado} onChange={(e) => cambiarEstado(p.id, e.target.value)}>
                  {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <ul className="items-pedido">
                {p.items.map((it, i) => (
                  <li key={i}>{it.cantidad}x {it.producto} — ${it.precioUnitario * it.cantidad}</li>
                ))}
              </ul>
              <p className="total-pedido">Total: ${p.total}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
