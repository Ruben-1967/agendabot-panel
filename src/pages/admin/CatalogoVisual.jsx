import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchCatalogoCategorias,
  crearCatalogoCategoria,
  eliminarCatalogoCategoria,
  fetchCatalogoItems,
  subirCatalogoItem,
  actualizarCatalogoItem,
  eliminarCatalogoItem,
  actualizarCatalogoVisualActivo,
} from '../../api/client';
import CatalogoImagenesGrid from '../../components/CatalogoImagenesGrid';
import './CatalogoVisual.css';

export default function CatalogoVisual() {
  const { token } = useAuth();

  const [categorias, setCategorias] = useState([]);
  const [limites, setLimites] = useState(null);
  const [totalImagenes, setTotalImagenes] = useState(0);
  const [catalogoVisualActivo, setCatalogoVisualActivo] = useState(false);
  const [categoriaSeleccionadaId, setCategoriaSeleccionadaId] = useState(null);
  const [items, setItems] = useState([]);

  const [cargandoCategorias, setCargandoCategorias] = useState(true);
  const [cargandoItems, setCargandoItems] = useState(false);
  const [guardandoSwitch, setGuardandoSwitch] = useState(false);
  const [error, setError] = useState('');

  const [mostrandoFormCategoria, setMostrandoFormCategoria] = useState(false);
  const [nombreCategoriaNueva, setNombreCategoriaNueva] = useState('');
  const [creandoCategoria, setCreandoCategoria] = useState(false);

  async function cargarCategorias() {
    setCargandoCategorias(true);
    try {
      const data = await fetchCatalogoCategorias(token);
      setCategorias(data.categorias);
      setLimites(data.limites);
      setTotalImagenes(data.totalImagenes);
      setCatalogoVisualActivo(data.catalogoVisualActivo);
      if (!categoriaSeleccionadaId && data.categorias.length > 0) {
        setCategoriaSeleccionadaId(data.categorias[0].id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCargandoCategorias(false);
    }
  }

  async function cargarItems(categoriaId) {
    setCargandoItems(true);
    try {
      const data = await fetchCatalogoItems(token, categoriaId);
      setItems(data.items);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargandoItems(false);
    }
  }

  useEffect(() => { cargarCategorias(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (categoriaSeleccionadaId) cargarItems(categoriaSeleccionadaId);
  }, [categoriaSeleccionadaId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function alternarSwitchMaestro() {
    setGuardandoSwitch(true);
    setError('');
    try {
      const data = await actualizarCatalogoVisualActivo(token, !catalogoVisualActivo);
      setCatalogoVisualActivo(data.catalogoVisualActivo);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardandoSwitch(false);
    }
  }

  async function manejarCrearCategoria(e) {
    e.preventDefault();
    if (!nombreCategoriaNueva.trim()) return;
    setCreandoCategoria(true);
    setError('');
    try {
      const data = await crearCatalogoCategoria(token, nombreCategoriaNueva.trim());
      setNombreCategoriaNueva('');
      setMostrandoFormCategoria(false);
      await cargarCategorias();
      setCategoriaSeleccionadaId(data.categoria.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreandoCategoria(false);
    }
  }

  async function eliminarCategoriaActual() {
    const categoria = categorias.find((c) => c.id === categoriaSeleccionadaId);
    if (!categoria) return;
    if (!confirm(`¿Eliminar la categoría "${categoria.nombre}"?`)) return;
    setError('');
    try {
      await eliminarCatalogoCategoria(token, categoria.id);
      setCategoriaSeleccionadaId(null);
      await cargarCategorias();
    } catch (err) {
      setError(err.message);
    }
  }

  async function manejarSubir({ nombre, descripcion, archivo }) {
    setError('');
    try {
      await subirCatalogoItem(token, { nombre, categoriaId: categoriaSeleccionadaId, descripcion, archivo });
      await Promise.all([cargarCategorias(), cargarItems(categoriaSeleccionadaId)]);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  async function manejarEditar(item, datos) {
    setError('');
    try {
      await actualizarCatalogoItem(token, item.id, datos);
      await cargarItems(categoriaSeleccionadaId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  async function manejarAlternarActivo(item) {
    setError('');
    try {
      await actualizarCatalogoItem(token, item.id, { activo: !item.activo });
      await cargarItems(categoriaSeleccionadaId);
    } catch (err) {
      setError(err.message);
    }
  }

  async function manejarEliminar(item) {
    if (!confirm(`¿Eliminar "${item.nombre}"?`)) return;
    setError('');
    try {
      await eliminarCatalogoItem(token, item.id);
      await Promise.all([cargarCategorias(), cargarItems(categoriaSeleccionadaId)]);
    } catch (err) {
      setError(err.message);
    }
  }

  const categoriaActual = categorias.find((c) => c.id === categoriaSeleccionadaId);
  const limiteAlcanzado = limites && (
    totalImagenes >= limites.maxTotal ||
    (categoriaActual?._count?.items || 0) >= limites.maxPorCategoria
  );

  return (
    <div>
      <h1>Catálogo visual</h1>
      <p className="pagina-sub">
        Imágenes que AgendaBot puede ofrecer durante la conversación (cortes, armazones, tratamientos, platos, etc.) — solo mientras el cliente está indagando, nunca durante un agendamiento ya iniciado.
      </p>

      <div className="catalogo-switch-row">
        <label className="switch">
          <input
            type="checkbox"
            checked={catalogoVisualActivo}
            disabled={guardandoSwitch}
            onChange={alternarSwitchMaestro}
          />
          <span className="switch-slider" />
        </label>
        <div>
          <strong>Mostrar catálogo en el chat</strong>
          <p className="texto-muted" style={{ margin: 0 }}>
            {catalogoVisualActivo ? 'El bot puede ofrecer estas imágenes en la conversación.' : 'Apagado — el bot nunca menciona el catálogo.'}
          </p>
        </div>
      </div>

      {limites && (
        <p className={`contador-plan ${totalImagenes >= limites.maxTotal ? 'contador-lleno' : ''}`}>
          <strong>{totalImagenes}/{limites.maxTotal}</strong> imágenes usadas en tu plan (máx. {limites.maxPorCategoria} por categoría)
        </p>
      )}

      {error && <p className="mensaje-error">{error}</p>}

      {cargandoCategorias ? (
        <p className="texto-muted">Cargando…</p>
      ) : (
        <div className="catalogo-layout">
          <aside className="catalogo-riel">
            {categorias.map((c) => (
              <button
                key={c.id}
                className={`categoria-item ${c.id === categoriaSeleccionadaId ? 'activa' : ''}`}
                onClick={() => setCategoriaSeleccionadaId(c.id)}
              >
                <span>{c.nombre}</span>
                <span className="conteo">{c._count.items}</span>
              </button>
            ))}

            {mostrandoFormCategoria ? (
              <form className="form-categoria-nueva" onSubmit={manejarCrearCategoria}>
                <input
                  autoFocus
                  placeholder="Nombre de categoría"
                  value={nombreCategoriaNueva}
                  onChange={(e) => setNombreCategoriaNueva(e.target.value)}
                />
                <button type="submit" disabled={creandoCategoria}>{creandoCategoria ? '…' : 'OK'}</button>
              </form>
            ) : (
              <button className="btn-agregar-categoria" onClick={() => setMostrandoFormCategoria(true)}>
                + Agregar categoría
              </button>
            )}

            {categoriaActual && (
              <button className="btn-link btn-danger categoria-eliminar" onClick={eliminarCategoriaActual}>
                Eliminar "{categoriaActual.nombre}"
              </button>
            )}
          </aside>

          <div className="catalogo-contenido">
            {!categoriaActual ? (
              <p className="texto-muted">Crea una categoría para empezar a subir imágenes.</p>
            ) : cargandoItems ? (
              <p className="texto-muted">Cargando…</p>
            ) : (
              <CatalogoImagenesGrid
                items={items}
                limiteAlcanzado={limiteAlcanzado}
                mensajeLimite="Límite del plan alcanzado"
                onSubir={manejarSubir}
                onEditar={manejarEditar}
                onEliminar={manejarEliminar}
                onAlternarActivo={manejarAlternarActivo}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
