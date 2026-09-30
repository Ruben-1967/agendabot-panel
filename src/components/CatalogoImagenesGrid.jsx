import { useEffect, useState } from 'react';
import { leerArchivoComoBase64 } from '../api/client';

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
  const [imagenBase64Pendiente, setImagenBase64Pendiente] = useState(null);
  const [errorArchivo, setErrorArchivo] = useState('');
  const [nombreImagenNueva, setNombreImagenNueva] = useState('');
  const [descripcionImagenNueva, setDescripcionImagenNueva] = useState('');
  const [valoresExtraNueva, setValoresExtraNueva] = useState({});
  const [subiendo, setSubiendo] = useState(false);

  const [itemEditandoId, setItemEditandoId] = useState(null);
  const [nombreEdicion, setNombreEdicion] = useState('');
  const [descripcionEdicion, setDescripcionEdicion] = useState('');
  const [valoresExtraEdicion, setValoresExtraEdicion] = useState({});
  const [menuAbiertoId, setMenuAbiertoId] = useState(null);
  const [arrastrandoSobre, setArrastrandoSobre] = useState(false);

  useEffect(() => {
    if (!archivoPendiente) {
      setPreviewArchivoPendiente(null);
      return;
    }
    const url = URL.createObjectURL(archivoPendiente);
    setPreviewArchivoPendiente(url);
    return () => URL.revokeObjectURL(url);
  }, [archivoPendiente]);

  async function procesarArchivoElegido(archivo) {
    if (!archivo) return;
    setErrorArchivo('');
    setArchivoPendiente(archivo);
    setImagenBase64Pendiente(null);
    setNombreImagenNueva('');
    setDescripcionImagenNueva('');
    setValoresExtraNueva({});

    // Leer el archivo AL TOQUE, apenas se elige — no esperar a que el
    // usuario termine de escribir el nombre y confirme. En algunas PWA
    // instaladas de Android, esperar ese rato hace que la referencia al
    // archivo ya no sea legible (falla con "No se pudo leer el archivo"
    // recién al subir, sin relación aparente con el archivo en sí).
    try {
      const base64 = await leerArchivoComoBase64(archivo);
      setImagenBase64Pendiente(base64);
    } catch {
      setErrorArchivo('No se pudo leer este archivo — probá elegirlo de nuevo.');
      setArchivoPendiente(null);
    }
  }

  function manejarSeleccionArchivo(e) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    procesarArchivoElegido(archivo);
  }

  function manejarDrop(e) {
    e.preventDefault();
    setArrastrandoSobre(false);
    if (limiteAlcanzado) return;
    const archivo = e.dataTransfer.files?.[0];
    if (archivo && (archivo.type === 'image/jpeg' || archivo.type === 'image/png')) {
      procesarArchivoElegido(archivo);
    } else {
      setErrorArchivo('Solo se aceptan imágenes JPG o PNG.');
    }
  }

  function cancelarSubida() {
    setArchivoPendiente(null);
    setImagenBase64Pendiente(null);
    setErrorArchivo('');
    setNombreImagenNueva('');
    setDescripcionImagenNueva('');
    setValoresExtraNueva({});
  }

  async function confirmarSubida(e) {
    e.preventDefault();
    if (!nombreImagenNueva.trim() || !imagenBase64Pendiente) return;
    if (camposExtra.some((c) => c.requerido && !valoresExtraNueva[c.key]?.trim())) return;

    setSubiendo(true);
    try {
      await onSubir({
        nombre: nombreImagenNueva.trim(),
        descripcion: descripcionImagenNueva.trim() || undefined,
        imagenBase64: imagenBase64Pendiente,
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
                <div className="tarjeta-imagen-fila-nombre">
                  <span className="tarjeta-imagen-nombre">
                    <span className="indicador-estado" />
                    {item.nombre}
                  </span>
                  <div className="tarjeta-imagen-menu-wrap">
                    <button
                      type="button"
                      className="tarjeta-imagen-menu-boton"
                      onClick={() => setMenuAbiertoId(menuAbiertoId === item.id ? null : item.id)}
                      title="Más acciones"
                    >
                      ⋯
                    </button>
                    {menuAbiertoId === item.id && (
                      <div className="tarjeta-imagen-menu" onMouseLeave={() => setMenuAbiertoId(null)}>
                        <button className="tarjeta-imagen-menu-item" onClick={() => { empezarEdicion(item); setMenuAbiertoId(null); }}>
                          Editar
                        </button>
                        <button className="tarjeta-imagen-menu-item" onClick={() => { onAlternarActivo(item); setMenuAbiertoId(null); }}>
                          {item.activo ? 'Pausar' : 'Activar'}
                        </button>
                        <button className="tarjeta-imagen-menu-item tarjeta-imagen-menu-item-danger" onClick={() => { onEliminar(item); setMenuAbiertoId(null); }}>
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
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
              <button type="submit" className="btn-link" disabled={subiendo || !imagenBase64Pendiente}>
                {subiendo ? 'Subiendo…' : imagenBase64Pendiente ? 'Subir' : 'Leyendo archivo…'}
              </button>
              <button type="button" className="btn-link" onClick={cancelarSubida} disabled={subiendo}>Cancelar</button>
            </div>
          </form>
        </div>
      ) : (
        <label
          className={`tarjeta-subir ${limiteAlcanzado ? 'disabled' : ''} ${arrastrandoSobre ? 'arrastrando' : ''}`}
          onDragOver={(e) => { e.preventDefault(); if (!limiteAlcanzado) setArrastrandoSobre(true); }}
          onDragLeave={() => setArrastrandoSobre(false)}
          onDrop={manejarDrop}
        >
          <input
            type="file"
            accept="image/jpeg,image/png"
            disabled={limiteAlcanzado}
            onChange={manejarSeleccionArchivo}
          />
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="tarjeta-subir-icono-nube">
            <path d="M7 18a4.5 4.5 0 0 1-1.44-8.765 4.5 4.5 0 0 1 8.302-3.046 3.5 3.5 0 0 1 4.504 4.272A4 4 0 0 1 17 18H7Z" />
            <path d="M12 12v6M9.5 14.5 12 12l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{limiteAlcanzado ? (mensajeLimite || 'Límite alcanzado') : 'Arrastra una imagen aquí o haz clic para subir'}</span>
        </label>
      )}
      {errorArchivo && <p className="mensaje-error">{errorArchivo}</p>}
    </div>
  );
}
