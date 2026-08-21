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

  const [archivoPendiente, setArchivoPendiente] = useState(null);
  const [previewArchivoPendiente, setPreviewArchivoPendiente] = useState(null);
  const [nombreImagenNueva, setNombreImagenNueva] = useState('');
  const [descripcionImagenNueva, setDescripcionImagenNueva] = useState('');
  const [subiendo, setSubiendo] = useState(false);

  useEffect(() => {
    if (!archivoPendiente) {
      setPreviewArchivoPendiente(null);
      return;
    }
    const url = URL.createObjectURL(archivoPendiente);
    setPreviewArchivoPendiente(url);
    return () => URL.revokeObjectURL(url);
  }, [archivoPendiente]);

  const [itemEditandoId, setItemEditandoId] = useState(null);
  const [nombreEdicion, setNombreEdicion] = useState('');
  const [descripcionEdicion, setDescripcionEdicion] = useState('');

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

  function manejarSeleccionArchivo(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setArchivoPendiente(archivo);
    setNombreImagenNueva('');
    setDescripcionImagenNueva('');
    e.target.value = '';
  }

  function cancelarSubida() {
    setArchivoPendiente(null);
    setNombreImagenNueva('');
    setDescripcionImagenNueva('');
  }

  async function confirmarSubida(e) {
    e.preventDefault();
    if (!nombreImagenNueva.trim() || !archivoPendiente) return;
    setSubiendo(true);
    setError('');
    try {
      await subirCatalogoItem(token, {
        nombre: nombreImagenNueva.trim(),
        categoriaId: categoriaSeleccionadaId,
        descripcion: descripcionImagenNueva.trim() || undefined,
        archivo: archivoPendiente,
      });
      cancelarSubida();
      await Promise.all([cargarCategorias(), cargarItems(categoriaSeleccionadaId)]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendo(false);
    }
  }

  async function alternarActivoItem(item) {
    setError('');
    try {
      await actualizarCatalogoItem(token, item.id, { activo: !item.activo });
      await cargarItems(categoriaSeleccionadaId);
    } catch (err) {
      setError(err.message);
    }
  }

  function empezarEdicion(item) {
    setItemEditandoId(item.id);
    setNombreEdicion(item.nombre);
    setDescripcionEdicion(item.descripcion || '');
  }

  async function guardarEdicion(item) {
    if (!nombreEdicion.trim()) return;
    setError('');
    try {
      await actualizarCatalogoItem(token, item.id, {
        nombre: nombreEdicion.trim(),
        descripcion: descripcionEdicion.trim() || null,
      });
      setItemEditandoId(null);
      await cargarItems(categoriaSeleccionadaId);
    } catch (err) {
      setError(err.message);
    }
  }

  async function eliminarItem(item) {
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
              <div className="catalogo-grid">
                {items.map((item) => (
                  <div key={item.id} className={`tarjeta-imagen ${!item.activo ? 'inactiva' : ''}`}>
                    <img className="tarjeta-imagen-thumb" src={item.imagenUrl} alt={item.nombre} />
                    <div className="tarjeta-imagen-body">
                      {itemEditandoId === item.id ? (
                        <>
                          <input
                            autoFocus
                            value={nombreEdicion}
                            onChange={(e) => setNombreEdicion(e.target.value)}
                          />
                          <input
                            placeholder="Descripción (opcional)"
                            value={descripcionEdicion}
                            onChange={(e) => setDescripcionEdicion(e.target.value)}
                          />
                          <div className="tarjeta-imagen-acciones">
                            <button className="btn-link" onClick={() => guardarEdicion(item)}>Guardar</button>
                            <button className="btn-link" onClick={() => setItemEditandoId(null)}>Cancelar</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="tarjeta-imagen-nombre">
                            <span className="indicador-estado" />
                            {item.nombre}
                          </span>
                          <div className="tarjeta-imagen-acciones">
                            <button className="btn-link" onClick={() => empezarEdicion(item)}>Editar</button>
                            <button className="btn-link" onClick={() => alternarActivoItem(item)}>
                              {item.activo ? 'Pausar' : 'Activar'}
                            </button>
                            <button className="btn-link btn-danger" onClick={() => eliminarItem(item)}>Eliminar</button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {archivoPendiente ? (
                  <div className="tarjeta-imagen">
                    <img
                      className="tarjeta-imagen-thumb"
                      src={previewArchivoPendiente}
                      alt="Vista previa"
                    />
                    <form className="tarjeta-imagen-body" onSubmit={confirmarSubida}>
                      <input
                        autoFocus
                        placeholder="Nombre de la imagen"
                        value={nombreImagenNueva}
                        onChange={(e) => setNombreImagenNueva(e.target.value)}
                        required
                      />
                      <input
                        placeholder="Descripción (opcional)"
                        value={descripcionImagenNueva}
                        onChange={(e) => setDescripcionImagenNueva(e.target.value)}
                      />
                      <div className="tarjeta-imagen-acciones">
                        <button type="submit" className="btn-link" disabled={subiendo}>{subiendo ? 'Subiendo…' : 'Subir'}</button>
                        <button type="button" className="btn-link" onClick={cancelarSubida} disabled={subiendo}>Cancelar</button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <label className={`tarjeta-subir ${limiteAlcanzado ? 'disabled' : ''}`}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      disabled={limiteAlcanzado}
                      onChange={manejarSeleccionArchivo}
                    />
                    <span className="tarjeta-subir-icono">+</span>
                    <span>{limiteAlcanzado ? 'Límite del plan alcanzado' : 'Subir imagen'}</span>
                  </label>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
