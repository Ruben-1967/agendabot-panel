import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchProductos, crearProducto, actualizarProducto, eliminarProducto } from '../../api/client';

export default function Productos() {
  const { token } = useAuth();
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [unidad, setUnidad] = useState('unidad');
  const [unidadPersonalizada, setUnidadPersonalizada] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    setCargando(true);
    try {
      const data = await fetchProductos(token);
      setProductos(data.productos);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function manejarCrear(e) {
    e.preventDefault();
    if (!nombre || !precio) return;
    const unidadFinal = unidad === 'otra' ? unidadPersonalizada.trim() : unidad;
    if (unidad === 'otra' && !unidadFinal) return;
    setGuardando(true);
    setError('');
    try {
      await crearProducto(token, { nombre, precio: Number(precio), unidad: unidadFinal });
      setNombre('');
      setPrecio('');
      setUnidad('unidad');
      setUnidadPersonalizada('');
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function alternarActivo(producto) {
    try {
      await actualizarProducto(token, producto.id, { activo: !producto.activo });
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function eliminar(producto) {
    if (!confirm(`¿Eliminar "${producto.nombre}"?`)) return;
    try {
      await eliminarProducto(token, producto.id);
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>Catálogo de productos</h1>
      <p className="pagina-sub">Lo que ofreces en tus envíos de campaña. Desactiva lo que no tengas disponible en vez de eliminarlo.</p>

      <form className="form-inline" onSubmit={manejarCrear}>
        <input
          placeholder="Nombre (ej. Roll de canela)"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Precio"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          required
          min="0"
        />
        <select value={unidad} onChange={(e) => setUnidad(e.target.value)}>
          <option value="unidad">unidad</option>
          <option value="kg">kilo (kg)</option>
          <option value="litro">litro (L)</option>
          <option value="docena">docena</option>
          <option value="otra">otra…</option>
        </select>
        {unidad === 'otra' && (
          <input
            placeholder="Nombre de la unidad (ej. paquete, bandeja)"
            value={unidadPersonalizada}
            onChange={(e) => setUnidadPersonalizada(e.target.value)}
            required
          />
        )}
        <button type="submit" disabled={guardando}>{guardando ? 'Agregando…' : 'Agregar'}</button>
      </form>

      {error && <p className="mensaje-error">{error}</p>}

      {cargando ? (
        <p className="texto-muted">Cargando…</p>
      ) : productos.length === 0 ? (
        <p className="texto-muted">Todavía no tienes productos cargados.</p>
      ) : (
        <table className="tabla-simple">
          <thead>
            <tr><th>Producto</th><th>Precio</th><th>Unidad</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id} className={!p.activo ? 'fila-inactiva' : ''}>
                <td>{p.nombre}</td>
                <td>${p.precio}</td>
                <td>{p.unidad}</td>
                <td>{p.activo ? 'Activo' : 'Inactivo'}</td>
                <td className="acciones">
                  <button className="btn-link" onClick={() => alternarActivo(p)}>
                    {p.activo ? 'Desactivar' : 'Activar'}
                  </button>
                  <button className="btn-link btn-danger" onClick={() => eliminar(p)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
