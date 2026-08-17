import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './GestionProfesionales.css';
import { useAuth } from '../../context/AuthContext';
import EditorHorario from '../../components/EditorHorario';
import Bloqueos from '../../components/Bloqueos';
import Servicios from '../../components/Servicios';
import { fetchProfesionales, crearProfesional, actualizarProfesional, fetchServicios } from '../../api/client';

const NOMBRES_DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function resumenHorario(horarios) {
  if (!horarios || horarios.length === 0) return 'Sin horario cargado';
  const dias = [...new Set(horarios.map((h) => h.diaSemana))].sort();
  return dias.map((d) => NOMBRES_DIAS_CORTO[d]).join(', ');
}

function FormNuevoProfesional({ token, onCreado, onUpsell, onCancelar }) {
  const [nombre, setNombre] = useState('');
  const [duracion, setDuracion] = useState(30);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  async function manejarGuardar(e) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setGuardando(true);
    setError('');
    try {
      await crearProfesional(token, {
        nombre: nombre.trim(),
        duracionCitaMinutos: Number(duracion),
      });
      onCreado();
    } catch (err) {
      if (err.message === 'LIMITE_PROFESIONALES_ALCANZADO') {
        onUpsell();
      } else {
        setError(err.message);
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="form-campana" onSubmit={manejarGuardar}>
      {error && <p className="mensaje-error">{error}</p>}
      <label>
        Nombre del profesional
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej. Dra. Camila Reyes"
          required
          autoFocus
        />
      </label>
      <label>
        Duración de cada cita (minutos)
        <input type="number" min="5" value={duracion} onChange={(e) => setDuracion(e.target.value)} required />
      </label>
      <div className="acciones-form-profesional">
        <button type="submit" disabled={guardando}>{guardando ? 'Creando…' : 'Crear profesional'}</button>
        <button type="button" className="btn-link" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  );
}

function DatosBaseProfesional({ profesional, token, onCambio, setError }) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(profesional.nombre);
  const [duracion, setDuracion] = useState(profesional.duracionCitaMinutos);
  const [anticipacion, setAnticipacion] = useState(profesional.anticipacionMinimaMin);
  const [horizonte, setHorizonte] = useState(profesional.horizonteAgendaDias);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      await actualizarProfesional(token, profesional.id, {
        nombre,
        duracionCitaMinutos: Number(duracion),
        anticipacionMinimaMin: Number(anticipacion),
        horizonteAgendaDias: Number(horizonte),
      });
      setEditando(false);
      await onCambio();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  if (!editando) {
    return (
      <button type="button" className="btn-link" onClick={(e) => { e.stopPropagation(); setEditando(true); }}>
        Editar datos básicos
      </button>
    );
  }

  return (
    <form className="form-campana" onClick={(e) => e.stopPropagation()} onSubmit={guardar}>
      <label>
        Nombre
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
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
        Horizonte de agenda (días hacia adelante)
        <input type="number" min="1" value={horizonte} onChange={(e) => setHorizonte(e.target.value)} />
      </label>
      <div className="acciones-form-profesional">
        <button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button>
        <button type="button" className="btn-link" onClick={() => setEditando(false)} disabled={guardando}>Cancelar</button>
      </div>
    </form>
  );
}

// Vista de solo lectura del horario semanal — mismos datos que EditorHorario
// pero sin controles, para planes donde esta pestaña queda bloqueada.
function ResumenHorarioSoloLectura({ horarios }) {
  const activos = (horarios || []).filter((h) => h.activo).sort((a, b) => a.diaSemana - b.diaSemana);
  if (activos.length === 0) return <p className="texto-muted">Sin horario cargado.</p>;
  return (
    <ul className="lista-campos-plantilla">
      {activos.map((h) => (
        <li key={h.id}>{NOMBRES_DIAS_CORTO[h.diaSemana]}: {h.horaInicio} – {h.horaFin}</li>
      ))}
    </ul>
  );
}

function BloqueosSoloLectura({ bloqueos }) {
  if (!bloqueos || bloqueos.length === 0) return <p className="texto-muted">No hay bloqueos cargados.</p>;
  return (
    <ul className="lista-campos-plantilla">
      {bloqueos.map((b) => (
        <li key={b.id}>
          {new Date(b.fechaInicio).toLocaleDateString('es-CL', { timeZone: 'UTC' })} – {new Date(b.fechaFin).toLocaleDateString('es-CL', { timeZone: 'UTC' })}
          {b.motivo ? ` (${b.motivo})` : ''}
        </li>
      ))}
    </ul>
  );
}

function TarjetaProfesional({ profesional, token, onCambio, setError, expandido, onToggle, bloqueado }) {
  return (
    <div className="tarjeta-profesional-wrap">
      <div className="tarjeta-profesional" onClick={onToggle} role="button" tabIndex={0}>
        <div className="tarjeta-profesional-info">
          <strong>{profesional.nombre}</strong>
          <span className="texto-muted">{resumenHorario(profesional.horarios)} · {profesional.duracionCitaMinutos} min por cita</span>
        </div>
        <div className="tarjeta-profesional-derecha">
          {profesional.usuarios && profesional.usuarios.length > 0 ? (
            <span className="estado-pill estado-enviado">Con acceso al panel</span>
          ) : (
            <span className="estado-pill estado-ninguno">Sin usuario asignado</span>
          )}
          <span className="btn-link">
            {expandido ? 'Ocultar' : bloqueado ? 'Ver detalle' : 'Editar horario'}
          </span>
        </div>
      </div>
      {expandido && (
        <div className="editor-horario-tarjeta">
          {bloqueado ? (
            <>
              <h3 className="subtitulo-tarjeta">Horario semanal</h3>
              <ResumenHorarioSoloLectura horarios={profesional.horarios} />
              <h3 className="subtitulo-tarjeta">Vacaciones y feriados</h3>
              <BloqueosSoloLectura bloqueos={profesional.bloqueos} />
              <p className="texto-muted" style={{ marginTop: 8 }}>
                Estos datos se administran desde "Configuración de agenda" en tu plan actual.
              </p>
            </>
          ) : (
            <>
              <h3 className="subtitulo-tarjeta">Datos básicos</h3>
              <DatosBaseProfesional profesional={profesional} token={token} onCambio={onCambio} setError={setError} />
              <h3 className="subtitulo-tarjeta">Horario semanal</h3>
              <EditorHorario
                horarios={profesional.horarios}
                recursoId={profesional.id}
                token={token}
                onGuardado={onCambio}
                setError={setError}
              />
              <h3 className="subtitulo-tarjeta">Vacaciones y feriados</h3>
              <Bloqueos
                bloqueos={profesional.bloqueos || []}
                recursoId={profesional.id}
                token={token}
                onCambio={onCambio}
                setError={setError}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function GestionProfesionales() {
  const { token, usuario } = useAuth();
  // Plan A ya administra Servicios/Horario/etc. desde "Configuración de
  // agenda" (para su único profesional) — dejar esos mismos campos editables
  // acá también sería duplicado y confuso, así que esta pestaña queda de
  // solo lectura + el aviso de upgrade siempre visible.
  const bloqueadoPorPlan = usuario?.plan === 'PLAN_A';
  const [profesionales, setProfesionales] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [limite, setLimite] = useState(null);
  const [puedeAgregarMas, setPuedeAgregarMas] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarUpsell, setMostrarUpsell] = useState(false);
  const [expandidoId, setExpandidoId] = useState(null);

  async function cargar() {
    try {
      const [data, serviciosData] = await Promise.all([fetchProfesionales(token), fetchServicios(token)]);
      setProfesionales(data.profesionales);
      setServicios(serviciosData.servicios);
      setLimite(data.limite);
      setPuedeAgregarMas(data.puedeAgregarMas);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  async function cargarServicios() {
    try {
      const serviciosData = await fetchServicios(token);
      setServicios(serviciosData.servicios);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function manejarClickAgregar() {
    setMostrarUpsell(false);
    if (puedeAgregarMas) {
      setMostrarForm(true);
    } else {
      setMostrarUpsell(true);
    }
  }

  function manejarCreado() {
    setMostrarForm(false);
    cargar();
  }

  if (cargando) return <p className="texto-muted">Cargando…</p>;

  const textoLimite = limite === null ? 'ilimitados' : `${profesionales.length} de ${limite}`;

  return (
    <div>
      <h1>Profesionales</h1>
      <p className="pagina-sub">Cada profesional tiene su propia agenda. Los servicios pueden requerir un profesional específico o dejar que el sistema asigne automáticamente al primero disponible.</p>

      {error && <p className="mensaje-error">{error}</p>}

    <h2 className="subtitulo">Servicios</h2>
      <Servicios servicios={servicios} profesionales={profesionales} token={token} onCambio={cargarServicios} setError={setError} bloqueado={bloqueadoPorPlan} />

      <h2 className="subtitulo">Profesionales</h2>
      <div className="barra-limite-profesionales">
        <span className="texto-muted">
          {limite === null ? 'Profesionales: ilimitados en tu plan' : `Profesionales: ${textoLimite} usados`}
        </span>
        {!mostrarForm && !bloqueadoPorPlan && (
          <button className="btn-agregar-profesional" onClick={manejarClickAgregar}>+ Agregar profesional</button>
        )}
      </div>

      {(mostrarUpsell || bloqueadoPorPlan) && (
        <div className="aviso-upsell">
          Tu plan actual permite máximo {limite} profesional{limite === 1 ? '' : 'es'}. <Link to="/suscripcion/elegir-plan" className="link-upsell">Mejora tu plan para agregar más.</Link>
        </div>
      )}

      {mostrarForm && !bloqueadoPorPlan && (
        <FormNuevoProfesional
          token={token}
          onCreado={manejarCreado}
          onUpsell={() => { setMostrarForm(false); setMostrarUpsell(true); }}
          onCancelar={() => setMostrarForm(false)}
        />
      )}

      {profesionales.length === 0 ? (
        <p className="texto-muted">Todavía no tienes profesionales cargados.</p>
      ) : (
        <div className="lista-profesionales">
          {profesionales.map((p) => (
            <TarjetaProfesional
              key={p.id}
              profesional={p}
              token={token}
              onCambio={cargar}
              setError={setError}
              expandido={expandidoId === p.id}
              onToggle={() => setExpandidoId(expandidoId === p.id ? null : p.id)}
              bloqueado={bloqueadoPorPlan}
            />
          ))}
        </div>
      )}
    </div>
  );
}