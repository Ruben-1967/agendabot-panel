import { useEffect, useState } from 'react';
import './ConfiguracionAgenda.css';
import { useAuth } from '../../context/AuthContext';
import EditorHorario from '../../components/EditorHorario';
import Servicios from '../../components/Servicios';
import SimpleDatePicker from '../../components/SimpleDatePicker';
import {
  fetchAgenda,
  guardarRecurso,
  crearBloqueo,
  eliminarBloqueo,
  fetchServicios,
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
  const [duracion] = useState(recurso?.duracionCitaMinutos ?? 30);
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
      {/* Duración de cada cita: se sigue mandando en el guardado (duracionCitaMinutos
          es un campo obligatorio del recurso), pero ya no se muestra acá — ese dato
          vive por servicio (ver sección "Servicios" más abajo), que es donde
          corresponde configurarlo. */}
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

          <h2 className="subtitulo">Servicios</h2>
          <Servicios servicios={servicios} token={token} onCambio={cargar} setError={setError} />

          <h2 className="subtitulo">Vacaciones y feriados</h2>
          <Bloqueos bloqueos={recurso.bloqueos} token={token} onCambio={cargar} setError={setError} />
        </>
      )}
    </div>
  );
}
