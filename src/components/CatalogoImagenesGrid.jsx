import { useEffect, useState } from 'react';

/**
 * Grilla de imágenes del Catálogo Visual — thumbnail, nombre, indicador
 * activo/pausado, editar/eliminar, y tarjeta de subida al final. Compartida
 * entre el catálogo real (por empresa, CatalogoVisual.jsx) y el catálogo de
 * la demo (por rubro, CatalogoVisualDemoAdmin.jsx) — lo único que cambia
 * entre ambos contextos es de dónde salen los items y qué límites aplican,
 * así que esta pieza no sabe nada de eso: solo recibe items + callbacks.
 *
 * `camposExtra`: campos de texto adicionales que necesita el formulario de
 * subir/editar en un contexto pero no en otro (ej. "categoría" en el
 * catálogo de la demo, que no existe como concepto separado ahí). Cada uno:
 * { key, label, placeholder, requerido }.
 */
export default function CatalogoImagenesGrid({
  items,
  limiteAlcanzado,
  mensajeLimite,
  camposExtra = [],
  onSubir,
  onEditar,
  onEliminar,
  onAlternarActivo,
}) {
  const [archivoPendiente, setArchivoPendiente] = useState(null);
  const [previewArchivoPendiente, setPreviewArchivoPendiente] = useState(null);
  const [nombreImagenNueva, setNombreImagenNueva] = useState('');
  const [descripcionImagenNueva, setDescripcionImagenNueva] = useState('');
  const [valoresExtraNueva, setValoresExtraNueva] = useState({});
  const [subiendo, setSubiendo] = useState(false);

  const [itemEditandoId, setItemEditandoId] = useState(null);
  const [nombreEdicion, setNombreEdicion] = useState('');
  const [descripcionEdicion, setDescripcionEdicion] = useState('');
  const [valoresExtraEdicion, setValoresExtraEdicion] = useState({});

  useEffect(() => {
    if (!archivoPendiente) {
      setPreviewArchivoPendiente(null);
      return;
    }
    const url = URL.createObjectURL(archivoPendiente);
    setPreviewArchivoPendiente(url);
    return () => URL.revokeObjectURL(url);
  }, [archivoPendiente]);

  function manejarSeleccionArchivo(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setArchivoPendiente(archivo);
    setNombreImagenNueva('');
    setDescripcionImagenNueva('');
    setValoresExtraNueva({});
    e.target.value = '';
  }

  function cancelarSubida() {
    setArchivoPendiente(null);
    setNombreImagenNueva('');
    setDescripcionImagenNueva('');
    setValoresExtraNueva({});
  }

  async function confirmarSubida(e) {
    e.preventDefault();
    if (!nombreImagenNueva.trim() || !archivoPendiente) return;
    if (camposExtra.some((c) => c.requerido && !valoresExtraNueva[c.key]?.trim())) return;

    setSubiendo(true);
    try {
      await onSubir({
        nombre: nombreImagenNueva.trim(),
        descripcion: descripcionImagenNueva.trim() || undefined,
        archivo: archivoPendiente,
        ...valoresExtraNueva,
      });
      cancelarSubida();
    } finally {
      setSubiendo(false);
    }
  }

  function empezarEdicion(item) {
    setItemEditandoId(item.id);
    setNombreEdicion(item.nombre);
    setDescripcionEdicion(item.descripcion || '');
    const iniciales = {};
    for (const campo of camposExtra) iniciales[campo.key] = item[campo.key] || '';
    setValoresExtraEdicion(iniciales);
  }

  async function guardarEdicion(item) {
    if (!nombreEdicion.trim()) return;
    try {
      await onEditar(item, {
        nombre: nombreEdicion.trim(),
        descripcion: descripcionEdicion.trim() || null,
        ...valoresExtraEdicion,
      });
      setItemEditandoId(null);
    } catch {
      // El error ya se muestra en el padre (setError) — acá solo evitamos
      // dejar la promesa sin manejar; el form de edición se queda abierto.
    }
  }

  return (
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
                {camposExtra.map((campo) => (
                  <input
                    key={campo.key}
                    placeholder={campo.label}
                    value={valoresExtraEdicion[campo.key] || ''}
                    onChange={(e) => setValoresExtraEdicion((v) => ({ ...v, [campo.key]: e.target.value }))}
                  />
                ))}
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
                  <button className="btn-link" onClick={() => onAlternarActivo(item)}>
                    {item.activo ? 'Pausar' : 'Activar'}
                  </button>
                  <button className="btn-link btn-danger" onClick={() => onEliminar(item)}>Eliminar</button>
                </div>
              </>
            )}
          </div>
        </div>
      ))}

      {archivoPendiente ? (
        <div className="tarjeta-imagen">
          <img className="tarjeta-imagen-thumb" src={previewArchivoPendiente} alt="Vista previa" />
          <form className="tarjeta-imagen-body" onSubmit={confirmarSubida}>
            <input
              autoFocus
              placeholder="Nombre de la imagen"
              value={nombreImagenNueva}
              onChange={(e) => setNombreImagenNueva(e.target.value)}
              required
            />
            {camposExtra.map((campo) => (
              <input
                key={campo.key}
                placeholder={campo.placeholder || campo.label}
                value={valoresExtraNueva[campo.key] || ''}
                onChange={(e) => setValoresExtraNueva((v) => ({ ...v, [campo.key]: e.target.value }))}
                required={campo.requerido}
              />
            ))}
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
          <span>{limiteAlcanzado ? (mensajeLimite || 'Límite alcanzado') : 'Subir imagen'}</span>
        </label>
      )}
    </div>
  );
}
