import { useEffect, useState } from 'react';
import './ConfiguracionAgenda.css';
import { useAuth } from '../../context/AuthContext';
import EditorHorario from '../../components/EditorHorario';
import SimpleDatePicker from '../../components/SimpleDatePicker';
import {
  fetchAgenda,
  guardarRecurso,
  crearBloqueo,
  eliminarBloqueo,
  guardarExcepcion,
  eliminarExcepcion,
  fetchEjemplosFormulario,
} from '../../api/client';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
// "YYYY-MM-DD" -> "3 de septiembre", sin pasar por Date/zona horaria — la
// fecha de una excepción es un valor de calendario puro, no un instante.
function formatearFechaLarga(fechaISO) {
  const [, mes, dia] = fechaISO.split('-').map(Number);
  return `${dia} de ${MESES[mes - 1]}`;
}

function generarClave() {
  return Math.random().toString(36).slice(2);
}

// ------------------------------------------------------------
// Datos base del recurso (nombre, duración de cita, anticipación, horizonte)
// ------------------------------------------------------------
function FormRecurso({ recurso, token, onGuardado, setError, ejemploNombre }) {
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
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={ejemploNombre || 'Ej. Atención al público'} required />
      </label>
      <label>
        {/* Restaurado 2026-08-31: esta es la ÚNICA duración real que usa el
            motor de agendamiento (disponibilidad.js/crearCita nunca miró la
            duración del Servicio) — un intento anterior de mover esto a
            "por servicio" solo sacó el campo de acá sin cambiar el motor,
            dejando la duración real congelada en lo que fuera que tuviera
            guardado el recurso, sin forma de editarla desde el panel. */}
        Duración de cada cita (minutos)
        <input type="number" min="1" value={duracion} onChange={(e) => setDuracion(e.target.value)} required />
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
        <label className="campo-segmento">Desde <SimpleDatePicker value={fechaInicio} onChange={setFechaInicio} /></label>
        <label className="campo-segmento">Hasta <SimpleDatePicker value={fechaFin} onChange={setFechaFin} /></label>
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
// Excepciones de horario: horario variable por fecha puntual (negocios
// cuyos días de atención rotan semana a semana). Un día se rige por esta
// excepción en vez del horario semanal solo si tiene una cargada acá — el
// resto de los días sigue funcionando exactamente igual que siempre.
// ------------------------------------------------------------
function Excepciones({ excepciones, recursoId, token, onCambio, setError }) {
  const [fecha, setFecha] = useState('');
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('13:00');
  const [guardando, setGuardando] = useState(false);
  const [citasEnConflicto, setCitasEnConflicto] = useState(null);

  async function manejarGuardar(e) {
    e.preventDefault();
    if (!fecha) return;
    setGuardando(true);
    setError('');
    setCitasEnConflicto(null);
    try {
      const data = await guardarExcepcion(token, { recursoAgendableId: recursoId, fecha, horaInicio, horaFin });
      setFecha('');
      if (data.citasEnConflicto?.length > 0) {
        setCitasEnConflicto(data.citasEnConflicto);
      }
      await onCambio();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function manejarEliminar(id) {
    if (!confirm('¿Quitar esta excepción? Ese día vuelve a regirse por el horario semanal normal.')) return;
    try {
      await eliminarExcepcion(token, id);
      await onCambio();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <p className="texto-muted">
        Para negocios cuyo horario cambia semana a semana: elige una fecha puntual y su horario para ese día — el resto de los días sigue usando el horario semanal de arriba sin cambios.
      </p>
      <form className="form-inline" onSubmit={manejarGuardar}>
        <label className="campo-segmento">Fecha <SimpleDatePicker value={fecha} onChange={setFecha} /></label>
        <label className="campo-segmento">
          Desde
          <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
        </label>
        <label className="campo-segmento">
          Hasta
          <input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} />
        </label>
        <button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar excepción'}</button>
      </form>

      {citasEnConflicto && (
        <p className="mensaje-error">
          Este horario deja fuera a {citasEnConflicto.length} cita{citasEnConflicto.length > 1 ? 's' : ''} ya agendada{citasEnConflicto.length > 1 ? 's' : ''} ese día —
          no se cancelaron, reagéndalas desde Tabla de citas: {citasEnConflicto.map((c) => `${c.nombre} (${c.hora})`).join(', ')}.
        </p>
      )}

      {excepciones.length === 0 ? (
        <p className="texto-muted">No hay excepciones cargadas — todos los días siguen el horario semanal.</p>
      ) : (
        <table className="tabla-simple">
          <thead><tr><th>Fecha</th><th>Horario</th><th></th></tr></thead>
          <tbody>
            {excepciones.map((ex) => (
              <tr key={ex.id}>
                <td>{formatearFechaLarga(ex.fecha)}</td>
                <td>{ex.horaInicio} – {ex.horaFin}</td>
                <td className="acciones">
                  <button className="btn-link btn-danger" onClick={() => manejarEliminar(ex.id)}>Quitar</button>
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
// Página principal
// ------------------------------------------------------------
export default function ConfiguracionAgenda() {
  const { token } = useAuth();
  const [recurso, setRecurso] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [ejemplos, setEjemplos] = useState({});

  async function cargar() {
    try {
      const agenda = await fetchAgenda(token);
      setRecurso(agenda.recurso);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    fetchEjemplosFormulario(token).then(setEjemplos).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (cargando) return <p className="texto-muted">Cargando…</p>;

  return (
    <div>
      <h1>Agenda</h1>
      <p className="pagina-sub">Horario de atención y vacaciones/feriados del negocio — esto es lo que usa el chatbot para agendar citas reales por WhatsApp. Los servicios que ofrece el negocio se administran en "Información del negocio".</p>

      {error && <p className="mensaje-error">{error}</p>}

      <h2 className="subtitulo">Datos de la agenda (profesional / calendario único)</h2>
      <FormRecurso recurso={recurso} token={token} onGuardado={cargar} setError={setError} ejemploNombre={ejemplos.nombreRecurso} />

      {!recurso ? (
        <p className="texto-muted">Guarda los datos de arriba primero para poder cargar el horario semanal y los bloqueos.</p>
      ) : (
        <>
          <h2 className="subtitulo">Horario semanal</h2>
          <EditorHorario horarios={recurso.horarios} token={token} onGuardado={cargar} setError={setError} />

          <h2 className="subtitulo">Excepciones de horario (días variables)</h2>
          <Excepciones excepciones={recurso.excepciones || []} recursoId={recurso.id} token={token} onCambio={cargar} setError={setError} />

          <h2 className="subtitulo">Vacaciones y feriados</h2>
          <Bloqueos bloqueos={recurso.bloqueos} token={token} onCambio={cargar} setError={setError} />
        </>
      )}
    </div>
  );
}
