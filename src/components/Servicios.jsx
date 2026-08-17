import { Fragment, useEffect, useState } from 'react';
import { crearServicio, actualizarServicio, eliminarServicio, fetchPlantillasFicha } from '../api/client';

// Vista previa de los campos de una plantilla — camposFicha es plano o con
// un nivel de anidamiento (ej. { od: { esfera: "number", ... } }). Sin
// recursión más allá de eso, que es lo que existe hoy.
function VistaPreviaCampos({ camposFicha }) {
  if (!camposFicha || Object.keys(camposFicha).length === 0) {
    return <p className="texto-muted" style={{ margin: '4px 0 0' }}>Esta plantilla no tiene campos.</p>;
  }
  return (
    <ul className="lista-campos-plantilla">
      {Object.entries(camposFicha).map(([clave, valor]) => (
        typeof valor === 'object' && valor !== null ? (
          <li key={clave}>
            <strong>{clave}</strong>: {Object.entries(valor).map(([k, v]) => `${k} (${v})`).join(', ')}
          </li>
        ) : (
          <li key={clave}><strong>{clave}</strong> ({valor})</li>
        )
      ))}
    </ul>
  );
}

/**
 * Gestión de servicios (tipos de atención que ofrece la empresa). Es una
 * configuración a nivel de negocio completo, no por profesional individual
 * — por eso vive tanto en ConfiguracionAgenda.jsx (negocios de un solo
 * profesional) como en GestionProfesionales.jsx (negocios multi-profesional,
 * como sección general arriba de la lista de profesionales).
 */
export default function Servicios({ servicios, profesionales, token, onCambio, setError, bloqueado = false }) {
  const [nombre, setNombre] = useState('');
  const [duracionMinutos, setDuracionMinutos] = useState('');
  const [plantillaFichaId, setPlantillaFichaId] = useState('');
  const [guardando, setGuardando] = useState(false);
  // Solo se usa cuando bloqueado=true: el form de creación arranca
  // colapsado detrás de un botón, en vez de mostrarse siempre abierto.
  const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false);

  const [editandoId, setEditandoId] = useState(null);
  const [nombreEdicion, setNombreEdicion] = useState('');
  const [duracionEdicion, setDuracionEdicion] = useState('');
  const [plantillaFichaIdEdicion, setPlantillaFichaIdEdicion] = useState('');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  // Catálogo fijo de fichas dinámicas — el negocio elige entre estas, no
  // diseña campos libres. Se ven todas, no solo las sugeridas para el rubro.
  const [plantillasFicha, setPlantillasFicha] = useState([]);
  useEffect(() => {
    fetchPlantillasFicha(token)
      .then((data) => {
        const plantillas = data.plantillas || [];
        setPlantillasFicha(plantillas);
        // Ya no existe la opción "sin ficha" — el select queda controlado y
        // requiere un valor real, así que precargamos la primera plantilla
        // apenas llegan, para que coincida con lo que el navegador muestra.
        if (plantillas.length > 0) setPlantillaFichaId((actual) => actual || plantillas[0].id);
      })
      .catch(() => {});
  }, [token]);

  // Vinculación con profesionales: id del servicio cuyo panel de
  // asignación está abierto (null si ninguno). Solo tiene sentido cuando
  // hay más de un profesional — con uno solo, no hay nada que elegir.
  const [asignandoId, setAsignandoId] = useState(null);
  const [guardandoAsignacion, setGuardandoAsignacion] = useState(false);
  const hayMultiplesProfesionales = profesionales && profesionales.length > 1;

  async function manejarCrear(e) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setGuardando(true);
    setError('');
    try {
      await crearServicio(token, {
        nombre,
        duracionMinutos: duracionMinutos ? Number(duracionMinutos) : null,
        plantillaFichaId: plantillaFichaId || null,
      });
      setNombre('');
      setDuracionMinutos('');
      setPlantillaFichaId(plantillasFicha[0]?.id || '');
      await onCambio();
      if (bloqueado) setMostrarFormNuevo(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function alternarActivo(servicio) {
    try {
      await actualizarServicio(token, servicio.id, { activo: !servicio.activo });
      await onCambio();
    } catch (err) {
      setError(err.message);
    }
  }

  async function eliminar(servicio) {
    if (!confirm(`¿Eliminar "${servicio.nombre}"?`)) return;
    try {
      await eliminarServicio(token, servicio.id);
      await onCambio();
    } catch (err) {
      setError(err.message);
    }
  }

  function comenzarEdicion(servicio) {
    setEditandoId(servicio.id);
    setNombreEdicion(servicio.nombre);
    setDuracionEdicion(servicio.duracionMinutos ?? '');
    // "Sin ficha" ya no es una opción — si el servicio quedó así de antes
    // (creado previo a este cambio), se precarga la primera plantilla real
    // disponible en vez de dejar el select sin nada seleccionado.
    setPlantillaFichaIdEdicion(servicio.plantillaFichaId || plantillasFicha[0]?.id || '');
  }

  function cancelarEdicion() {
    setEditandoId(null);
    setNombreEdicion('');
    setDuracionEdicion('');
    setPlantillaFichaIdEdicion('');
  }

  async function alternarRequiereProfesional(servicio) {
    try {
      await actualizarServicio(token, servicio.id, {
        requiereProfesionalEspecifico: !servicio.requiereProfesionalEspecifico,
      });
      await onCambio();
    } catch (err) {
      setError(err.message);
    }
  }

  async function alternarProfesionalVinculado(servicio, recursoId) {
    const actuales = (servicio.recursos || []).map((sr) => sr.recurso.id);
    const nuevos = actuales.includes(recursoId)
      ? actuales.filter((id) => id !== recursoId)
      : [...actuales, recursoId];

    setGuardandoAsignacion(true);
    setError('');
    try {
      await actualizarServicio(token, servicio.id, { recursoIds: nuevos });
      await onCambio();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardandoAsignacion(false);
    }
  }

  async function guardarEdicion(servicio) {
    if (!nombreEdicion.trim()) return;
    setGuardandoEdicion(true);
    setError('');
    try {
      await actualizarServicio(token, servicio.id, {
        nombre: nombreEdicion.trim(),
        duracionMinutos: duracionEdicion ? Number(duracionEdicion) : null,
        plantillaFichaId: plantillaFichaIdEdicion || null,
      });
      cancelarEdicion();
      await onCambio();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardandoEdicion(false);
    }
  }

  return (
    <div>
      {bloqueado && (
        <p className="texto-muted" style={{ marginBottom: 8 }}>
          Editar o eliminar un servicio existente se administra desde "Configuración de agenda".
        </p>
      )}
      {bloqueado && !mostrarFormNuevo && (
        <button type="button" className="cta-secundaria" onClick={() => setMostrarFormNuevo(true)} style={{ marginBottom: 16 }}>
          + Agregar servicio
        </button>
      )}
      {(!bloqueado || mostrarFormNuevo) && (
        <>
          <form className="form-inline" onSubmit={manejarCrear} style={{ flexWrap: 'wrap' }}>
            <input placeholder="Nombre (ej. Examen visual)" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            <input type="number" min="1" placeholder="Duración (min, opcional)" value={duracionMinutos} onChange={(e) => setDuracionMinutos(e.target.value)} />
            <select value={plantillaFichaId} onChange={(e) => setPlantillaFichaId(e.target.value)} required>
              {plantillasFicha.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
            <button type="submit" disabled={guardando}>{guardando ? 'Agregando…' : 'Agregar servicio'}</button>
            {bloqueado && (
              <button type="button" className="btn-link" onClick={() => setMostrarFormNuevo(false)} disabled={guardando}>Cancelar</button>
            )}
          </form>
          {plantillaFichaId && (
            <div className="bloque-segmentacion" style={{ marginTop: 0, marginBottom: 16 }}>
              <p className="texto-muted" style={{ margin: '0 0 4px' }}>Campos de "{plantillasFicha.find((p) => p.id === plantillaFichaId)?.nombre}":</p>
              <VistaPreviaCampos camposFicha={plantillasFicha.find((p) => p.id === plantillaFichaId)?.camposFicha} />
            </div>
          )}
        </>
      )}

      {servicios.length === 0 ? (
        <p className="texto-muted">Todavía no tienes servicios cargados.</p>
      ) : (
        <table className="tabla-simple">
          <thead><tr><th>Servicio</th><th>Duración</th><th>Ficha</th><th>Estado</th>{hayMultiplesProfesionales && <th>Profesionales</th>}{!bloqueado && <th></th>}</tr></thead>
          <tbody>
            {servicios.map((s) => {
              const enEdicion = editandoId === s.id;
              const asignando = asignandoId === s.id;
              const recursosVinculados = (s.recursos || []).map((sr) => sr.recurso);
              return (
                <Fragment key={s.id}>
                  <tr className={!s.activo ? 'fila-inactiva' : ''}>
                    {enEdicion ? (
                      <>
                        <td>
                          <input
                            value={nombreEdicion}
                            onChange={(e) => setNombreEdicion(e.target.value)}
                            autoFocus
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            value={duracionEdicion}
                            onChange={(e) => setDuracionEdicion(e.target.value)}
                            placeholder="min"
                            style={{ width: 70 }}
                          />
                        </td>
                        <td>
                          <select value={plantillaFichaIdEdicion} onChange={(e) => setPlantillaFichaIdEdicion(e.target.value)} required>
                            {plantillasFicha.map((p) => (
                              <option key={p.id} value={p.id}>{p.nombre}</option>
                            ))}
                          </select>
                        </td>
                        <td>{s.activo ? 'Activo' : 'Inactivo'}</td>
                        {hayMultiplesProfesionales && <td>—</td>}
                        <td className="acciones">
                          <button className="btn-link" onClick={() => guardarEdicion(s)} disabled={guardandoEdicion}>
                            {guardandoEdicion ? 'Guardando…' : 'Guardar'}
                          </button>
                          <button className="btn-link" onClick={cancelarEdicion} disabled={guardandoEdicion}>Cancelar</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{s.nombre}</td>
                        <td>{s.duracionMinutos ? `${s.duracionMinutos} min` : '—'}</td>
                        <td>{s.plantillaFicha ? s.plantillaFicha.nombre : <span className="texto-muted">Hereda del rubro</span>}</td>
                        <td>{s.activo ? 'Activo' : 'Inactivo'}</td>
                        {hayMultiplesProfesionales && (
                          <td>
                            {bloqueado ? (
                              recursosVinculados.length === 0 ? 'Sin asignar' : `${recursosVinculados.length} asignado(s)`
                            ) : (
                              <button className="btn-link" onClick={() => setAsignandoId(asignando ? null : s.id)}>
                                {recursosVinculados.length === 0 ? 'Sin asignar' : `${recursosVinculados.length} asignado(s)`}
                              </button>
                            )}
                          </td>
                        )}
                        {!bloqueado && (
                          <td className="acciones">
                            <button className="btn-link" onClick={() => comenzarEdicion(s)}>Editar</button>
                            <button className="btn-link" onClick={() => alternarActivo(s)}>{s.activo ? 'Desactivar' : 'Activar'}</button>
                            <button className="btn-link btn-danger" onClick={() => eliminar(s)}>Eliminar</button>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                  {asignando && hayMultiplesProfesionales && (
                    <tr>
                      <td colSpan={hayMultiplesProfesionales ? 6 : 5}>
                        <div className="bloque-segmentacion">
                          <label className="checkbox-segmentacion">
                            <input
                              type="checkbox"
                              checked={s.requiereProfesionalEspecifico}
                              onChange={() => alternarRequiereProfesional(s)}
                            />
                            Requiere elegir un profesional específico (si no, el sistema asigna automáticamente al primero disponible)
                          </label>
                          <p className="texto-muted" style={{ margin: '10px 0 6px' }}>¿Quién puede atender este servicio?</p>
                          <div className="grilla-checkbox">
                            {profesionales.map((p) => (
                              <label key={p.id} className="checkbox-producto">
                                <input
                                  type="checkbox"
                                  checked={recursosVinculados.some((r) => r.id === p.id)}
                                  disabled={guardandoAsignacion}
                                  onChange={() => alternarProfesionalVinculado(s, p.id)}
                                />
                                {p.nombre}
                              </label>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}