import { useEffect, useState } from 'react';
import './ConfiguracionAgenda.css';
import { useAuth } from '../../context/AuthContext';
import EditorHorario from '../../components/EditorHorario';
import {
  fetchAgenda,
  guardarRecurso,
  crearBloqueo,
  eliminarBloqueo,
  fetchServicios,
  crearServicio,
  actualizarServicio,
  eliminarServicio,
} from '../../api/client';

const NOMBRES_DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function generarClave() {
  return Math.random().toString(36).slice(2);
}

// ------------------------------------------------------------
// Datos base del recurso (nombre, duración de cita, anticipación, horizonte)
// ------------------------------------------------------------
function FormRecurso({ recurso, token, onGuardado, setError }) {
  const [nombre, setNombre] = useState(recurso?.nombre || '');
  const [duracion, setDuracion] = useState(recurso?.duracionCitaMinutos ?? 30);
  const [anticipacion, setAnticipacion] = useState(recurso?.anticipacionMinimaMin ?? 120);
  const [horizonte, setHorizonte] = useState(recurso?.horizonteAgendaDias ?? 28);
  const [guardando, setGuardando] = useState(false);

  async function manejarGuardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      await guardarRecurso(token, {
        nombre,
        duracionCitaMinutos: Number(duracion),
        anticipacionMinimaMin: Number(anticipacion),
        horizonteAgendaDias: Number(horizonte),
      });
      await onGuardado();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="form-campana" onSubmit={manejarGuardar}>
      <label>
        Nombre del recurso (negocio o profesional que atiende)
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Atención Ahorróptica" required />
      </label>
      <label>
        Duración de cada cita (minutos)
        <input type="number" min="5" value={duracion} onChange={(e) => setDuracion(e.target.value)} required />
      </label>
      <label>
        Anticipación mínima para agendar (minutos antes)
        <input type="number" min="0" value={anticipacion} onChange={(e) => setAnticipacion(e.target.value)} />
      </label>
      <label>
        Horizonte de agenda (días hacia adelante que se pueden reservar)
        <input type="number" min="1" value={horizonte} onChange={(e) => setHorizonte(e.target.value)} />
      </label>
      <button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : recurso ? 'Guardar cambios' : 'Crear recurso'}</button>
    </form>
  );
}


// ------------------------------------------------------------
// Bloqueos: vacaciones, feriados puntuales
// ------------------------------------------------------------
function Bloqueos({ bloqueos, token, onCambio, setError }) {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function manejarCrear(e) {
    e.preventDefault();
    if (!fechaInicio || !fechaFin) return;
    setGuardando(true);
    setError('');
    try {
      await crearBloqueo(token, { fechaInicio, fechaFin, motivo: motivo || null });
      setFechaInicio('');
      setFechaFin('');
      setMotivo('');
      await onCambio();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function manejarEliminar(id) {
    if (!confirm('¿Eliminar este bloqueo?')) return;
    try {
      await eliminarBloqueo(token, id);
      await onCambio();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <form className="form-inline" onSubmit={manejarCrear}>
        <label className="campo-segmento">Desde <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} required style={{ marginLeft: 6 }} /></label>
        <label className="campo-segmento">Hasta <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} required style={{ marginLeft: 6 }} /></label>
        <input placeholder="Motivo (opcional, ej. Vacaciones)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        <button type="submit" disabled={guardando}>{guardando ? 'Agregando…' : 'Agregar bloqueo'}</button>
      </form>

      {bloqueos.length === 0 ? (
        <p className="texto-muted">No hay bloqueos cargados (vacaciones, feriados, etc.).</p>
      ) : (
        <table className="tabla-simple">
          <thead><tr><th>Desde</th><th>Hasta</th><th>Motivo</th><th></th></tr></thead>
          <tbody>
            {bloqueos.map((b) => (
              <tr key={b.id}>
                <td>{new Date(b.fechaInicio).toLocaleDateString('es-CL', { timeZone: 'UTC' })}</td>
                <td>{new Date(b.fechaFin).toLocaleDateString('es-CL', { timeZone: 'UTC' })}</td>
                <td>{b.motivo || '—'}</td>
                <td className="acciones">
                  <button className="btn-link btn-danger" onClick={() => manejarEliminar(b.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Servicios (tipos de atención que ofrece la empresa)
// ------------------------------------------------------------
function Servicios({ servicios, token, onCambio, setError }) {
  const [nombre, setNombre] = useState('');
  const [duracionMinutos, setDuracionMinutos] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Edición inline: id del servicio que se está editando ahora mismo (null
  // si ninguno), y sus valores en edición.
  const [editandoId, setEditandoId] = useState(null);
  const [nombreEdicion, setNombreEdicion] = useState('');
  const [duracionEdicion, setDuracionEdicion] = useState('');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  async function manejarCrear(e) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setGuardando(true);
    setError('');
    try {
      await crearServicio(token, { nombre, duracionMinutos: duracionMinutos ? Number(duracionMinutos) : null });
      setNombre('');
      setDuracionMinutos('');
      await onCambio();
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
  }

  function cancelarEdicion() {
    setEditandoId(null);
    setNombreEdicion('');
    setDuracionEdicion('');
  }

  async function guardarEdicion(servicio) {
    if (!nombreEdicion.trim()) return;
    setGuardandoEdicion(true);
    setError('');
    try {
      await actualizarServicio(token, servicio.id, {
        nombre: nombreEdicion.trim(),
        duracionMinutos: duracionEdicion ? Number(duracionEdicion) : null,
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
      <form className="form-inline" onSubmit={manejarCrear}>
        <input placeholder="Nombre (ej. Examen visual)" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        <input type="number" min="1" placeholder="Duración (min, opcional)" value={duracionMinutos} onChange={(e) => setDuracionMinutos(e.target.value)} />
        <button type="submit" disabled={guardando}>{guardando ? 'Agregando…' : 'Agregar servicio'}</button>
      </form>

      {servicios.length === 0 ? (
        <p className="texto-muted">Todavía no tienes servicios cargados.</p>
      ) : (
        <table className="tabla-simple">
          <thead><tr><th>Servicio</th><th>Duración</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {servicios.map((s) => {
              const enEdicion = editandoId === s.id;
              return (
                <tr key={s.id} className={!s.activo ? 'fila-inactiva' : ''}>
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
                      <td>{s.activo ? 'Activo' : 'Inactivo'}</td>
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
                      <td>{s.activo ? 'Activo' : 'Inactivo'}</td>
                      <td className="acciones">
                        <button className="btn-link" onClick={() => comenzarEdicion(s)}>Editar</button>
                        <button className="btn-link" onClick={() => alternarActivo(s)}>{s.activo ? 'Desactivar' : 'Activar'}</button>
                        <button className="btn-link btn-danger" onClick={() => eliminar(s)}>Eliminar</button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Página principal
// ------------------------------------------------------------
export default function ConfiguracionAgenda() {
  const { token } = useAuth();
  const [recurso, setRecurso] = useState(null);
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  async function cargar() {
    try {
      const [agenda, serviciosData] = await Promise.all([fetchAgenda(token), fetchServicios(token)]);
      setRecurso(agenda.recurso);
      setServicios(serviciosData.servicios);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (cargando) return <p className="texto-muted">Cargando…</p>;

  return (
    <div>
      <h1>Agenda</h1>
      <p className="pagina-sub">Horario de atención, vacaciones/feriados y servicios que ofrece el negocio — esto es lo que usa el chatbot para agendar citas reales por WhatsApp.</p>

      {error && <p className="mensaje-error">{error}</p>}

      <h2 className="subtitulo">Datos del negocio</h2>
      <FormRecurso recurso={recurso} token={token} onGuardado={cargar} setError={setError} />

      {!recurso ? (
        <p className="texto-muted">Guarda los datos de arriba primero para poder cargar el horario semanal, los bloqueos y los servicios.</p>
      ) : (
        <>
          <h2 className="subtitulo">Horario semanal</h2>
          <EditorHorario horarios={recurso.horarios} token={token} onGuardado={cargar} setError={setError} />

          <h2 className="subtitulo">Vacaciones y feriados</h2>
          <Bloqueos bloqueos={recurso.bloqueos} token={token} onCambio={cargar} setError={setError} />

          <h2 className="subtitulo">Servicios</h2>
          <Servicios servicios={servicios} token={token} onCambio={cargar} setError={setError} />
        </>
      )}
    </div>
  );
}
