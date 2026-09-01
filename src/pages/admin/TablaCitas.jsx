import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchCitasDia,
  crearCitaManual,
  actualizarEstadoCita,
  fetchProfesionales,
  fetchServicios,
  fetchClientes,
} from '../../api/client';
import './TablaCitas.css';

function fechaHoyLocal() {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

// Confirmado/Asistió no son campos aparte en la base de datos, se derivan
// del mismo estado de la cita — ver EstadoCita en schema.prisma.
function confirmadoDeEstado(estado) {
  if (estado === 'CANCELADA') return null;
  return estado !== 'PENDIENTE';
}
function asistioDeEstado(estado) {
  if (estado === 'COMPLETADA') return true;
  if (estado === 'NO_ASISTIO') return false;
  return null;
}

// Compartido entre la tabla (desktop) y las tarjetas (móvil) — mismas
// celdas Confirmado/Asistió, dos layouts distintos alrededor.
function ToggleSiNo({ valor, deshabilitado, onSi, onNo }) {
  return (
    <div className="tabla-citas-toggle">
      <button className={valor === true ? 'activo-si' : ''} disabled={deshabilitado} onClick={onSi}>Sí</button>
      <button className={valor === false ? 'activo-no' : ''} disabled={deshabilitado} onClick={onNo}>No</button>
    </div>
  );
}

export default function TablaCitas() {
  const { token } = useAuth();
  const [fecha, setFecha] = useState(fechaHoyLocal());
  const [citas, setCitas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [actualizandoId, setActualizandoId] = useState(null);

  const [profesionales, setProfesionales] = useState([]);
  const [errorProfesionales, setErrorProfesionales] = useState(null);
  const [recursoFiltro, setRecursoFiltro] = useState('');
  const [servicioFiltro, setServicioFiltro] = useState('');

  const [servicios, setServicios] = useState([]);
  const [clientes, setClientes] = useState([]);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState(null);
  const [formHora, setFormHora] = useState('');
  const [formServicioId, setFormServicioId] = useState('');
  const [formRecursoId, setFormRecursoId] = useState('');
  const [formClienteId, setFormClienteId] = useState('');
  const [formNombreNuevo, setFormNombreNuevo] = useState('');
  const [formRutNuevo, setFormRutNuevo] = useState('');
  const [formTelefonoNuevo, setFormTelefonoNuevo] = useState('');

  useEffect(() => {
    if (!token) return;
    fetchProfesionales(token)
      .then((data) => setProfesionales(data.profesionales || []))
      // Antes esto se tragaba en silencio — si esta llamada fallaba, el
      // selector de profesional quedaba oculto (profesionales.length === 0)
      // y "Agregar cita" mandaba la cita sin recursoAgendableId, que el
      // backend rechazaba con "la empresa tiene más de un profesional" sin
      // que en el formulario se viera ninguna pista de qué pasó.
      .catch((err) => setErrorProfesionales(err.message));
    fetchServicios(token).then((data) => setServicios(data.servicios || [])).catch(() => {});
    fetchClientes(token).then((data) => setClientes(data.clientes || [])).catch(() => {});
  }, [token]);

  // Por defecto se elige el primer profesional apenas carga la lista, así
  // la grilla de horario (ver más abajo) se ve de entrada sin que el admin
  // tenga que elegir nada a mano — puede cambiar a otro profesional o a
  // "Todos" desde el filtro, que ahora siempre está visible.
  useEffect(() => {
    if (profesionales.length > 0 && !recursoFiltro) {
      setRecursoFiltro(profesionales[0].id);
    }
  }, [profesionales]); // eslint-disable-line react-hooks/exhaustive-deps

  // Con UN profesional puntual (el elegido en el filtro) el backend además
  // arma la grilla completa del día — todas las horas configuradas, tengan
  // o no paciente (ver GET /agenda/citas). Con "todos los profesionales"
  // eso no aplica (cada uno tiene su propio horario en paralelo, mezclar
  // huecos de varios sería engañoso), así que solo se listan las citas reales.
  const recursoParaGrilla = recursoFiltro;

  function cargarCitas() {
    if (!token) return;
    setCargando(true);
    setError(null);
    fetchCitasDia(token, fecha, recursoParaGrilla || undefined)
      .then((data) => setCitas(data.citas || []))
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }

  useEffect(cargarCitas, [token, fecha, recursoParaGrilla]); // eslint-disable-line react-hooks/exhaustive-deps

  // El filtro de servicio no aplica a las filas vacías de la grilla — un
  // horario libre sirve para cualquier servicio, no tiene sentido que
  // desaparezca solo porque hay un filtro de servicio activo.
  const citasFiltradas = citas.filter((c) => c.vacio || !servicioFiltro || c.servicioId === servicioFiltro);

  // Con un profesional puntual elegido (grilla activa) una tabla vacía casi
  // siempre significa que ese día no tiene bloque de horario configurado —
  // no que "no hay citas" (eso solo pasa si además hubiera horas libres sin
  // agendar, que ya se listarían). Mensaje distinto para no confundir un día
  // sin horario con un día laboral tranquilo.
  const mensajeVacio = recursoParaGrilla
    ? 'Este profesional no tiene horario configurado para este día (revisa Configuración de agenda).'
    : 'Sin citas agendadas este día.';

  async function marcarConfirmado(cita, valor) {
    if (cita.estado === 'CANCELADA' || cita.estado === 'COMPLETADA' || cita.estado === 'NO_ASISTIO') return;
    setActualizandoId(cita.id);
    try {
      await actualizarEstadoCita(token, cita.id, valor ? 'CONFIRMADA' : 'PENDIENTE');
      cargarCitas();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setActualizandoId(null);
    }
  }

  async function marcarAsistio(cita, valor) {
    if (cita.estado === 'CANCELADA') return;
    setActualizandoId(cita.id);
    try {
      await actualizarEstadoCita(token, cita.id, valor ? 'COMPLETADA' : 'NO_ASISTIO');
      cargarCitas();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setActualizandoId(null);
    }
  }

  // Libera el cupo aunque el paciente ya haya confirmado (o incluso
  // asistido) — a diferencia de los toggles de arriba, que se bloquean una
  // vez resuelto el estado, esto siempre está disponible como salida de
  // emergencia (el paciente avisó que no puede ir, hubo un error al
  // agendar, etc.).
  async function liberarHora(cita) {
    if (!window.confirm(`¿Liberar la hora ${cita.hora} de ${cita.nombre}? Queda disponible para otro paciente.`)) return;
    setActualizandoId(cita.id);
    try {
      await actualizarEstadoCita(token, cita.id, 'CANCELADA');
      cargarCitas();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setActualizandoId(null);
    }
  }

  function abrirFormulario(horaPrellenada = '') {
    setErrorForm(null);
    setFormHora(horaPrellenada);
    setFormServicioId('');
    setFormRecursoId('');
    setFormClienteId('');
    setFormNombreNuevo('');
    setFormRutNuevo('');
    setFormTelefonoNuevo('');
    setMostrarForm(true);
  }

  async function guardarCitaNueva(e) {
    e.preventDefault();
    setErrorForm(null);

    if (!formHora) {
      setErrorForm('Falta la hora');
      return;
    }
    if (!formClienteId && !formNombreNuevo.trim()) {
      setErrorForm('Falta el nombre del paciente');
      return;
    }

    setGuardando(true);
    try {
      await crearCitaManual(token, {
        fecha,
        hora: formHora,
        servicioId: formServicioId || undefined,
        recursoAgendableId: formRecursoId || undefined,
        ...(formClienteId
          ? { clienteId: formClienteId }
          : {
              clienteNuevo: {
                nombre: formNombreNuevo.trim(),
                rut: formRutNuevo.trim() || undefined,
                telefono: formTelefonoNuevo.trim() || undefined,
              },
            }),
      });
      setMostrarForm(false);
      cargarCitas();
      fetchClientes(token).then((data) => setClientes(data.clientes || [])).catch(() => {});
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="tabla-citas-pagina">
      <div className="tabla-citas-header">
        <h1>Tabla de citas</h1>
        <div className="tabla-citas-filtros">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="tabla-citas-fecha"
          />
          <select value={servicioFiltro} onChange={(e) => setServicioFiltro(e.target.value)}>
            <option value="">Todos los servicios</option>
            {servicios.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
          <select value={recursoFiltro} onChange={(e) => setRecursoFiltro(e.target.value)}>
            <option value="">Todos los profesionales</option>
            {profesionales.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
          <button className="btn-primario" onClick={() => abrirFormulario()}>+ Agregar cita</button>
        </div>
      </div>

      {error && <p className="mensaje-error">{error}</p>}
      {errorProfesionales && (
        <p className="mensaje-error">No se pudo cargar la lista de profesionales: {errorProfesionales}</p>
      )}

      {mostrarForm && (
        <form className="tabla-citas-form" onSubmit={guardarCitaNueva}>
          <h2>Nueva cita — {fecha}</h2>
          {errorForm && <p className="mensaje-error">{errorForm}</p>}

          <div className="tabla-citas-form-fila">
            <label>
              Hora
              <input type="time" value={formHora} onChange={(e) => setFormHora(e.target.value)} required />
            </label>

            <label>
              Servicio
              <select value={formServicioId} onChange={(e) => setFormServicioId(e.target.value)}>
                <option value="">Sin especificar</option>
                {servicios.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </label>

            {profesionales.length !== 1 && (
              <label>
                Profesional
                {/* Sin "required": dejarlo en "No especificar" es válido — el
                    backend asigna automáticamente al menos ocupado que esté
                    libre a esa hora (ver POST /agenda/citas). Antes esto era
                    obligatorio y bloqueaba guardar cuando no importaba quién
                    o no se sabía de antemano quién estaba libre. */}
                <select value={formRecursoId} onChange={(e) => setFormRecursoId(e.target.value)}>
                  <option value="">No especificar (asigna automático)</option>
                  {profesionales.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
                {errorProfesionales && (
                  <small className="mensaje-error">No se pudo cargar la lista de profesionales: {errorProfesionales}</small>
                )}
              </label>
            )}
          </div>

          <label>
            Paciente
            <select value={formClienteId} onChange={(e) => setFormClienteId(e.target.value)}>
              <option value="">+ Paciente nuevo</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre} — {c.rut || 'sin rut'}</option>
              ))}
            </select>
          </label>

          {!formClienteId && (
            <div className="tabla-citas-form-fila">
              <label>
                Nombre
                <input value={formNombreNuevo} onChange={(e) => setFormNombreNuevo(e.target.value)} required />
              </label>
              <label>
                Rut
                <input value={formRutNuevo} onChange={(e) => setFormRutNuevo(e.target.value)} />
              </label>
              <label>
                Fono
                <input value={formTelefonoNuevo} onChange={(e) => setFormTelefonoNuevo(e.target.value)} />
              </label>
            </div>
          )}

          <div className="tabla-citas-form-acciones">
            <button type="button" className="btn-link" onClick={() => setMostrarForm(false)}>Cancelar</button>
            <button type="submit" className="btn-primario" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar cita'}
            </button>
          </div>
        </form>
      )}

      <div className="tabla-citas-wrap">
        <table className="tabla-simple tabla-citas">
          <thead>
            <tr>
              <th>#</th>
              <th>Hora</th>
              <th>Nombre</th>
              <th>Rut</th>
              <th>Servicio</th>
              <th>Confirmado</th>
              <th>Fono</th>
              <th>Asistió</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={9} className="tabla-citas-vacio">Cargando…</td></tr>
            ) : citasFiltradas.length === 0 ? (
              <tr><td colSpan={9} className="tabla-citas-vacio">{mensajeVacio}</td></tr>
            ) : (
              citasFiltradas.map((cita, i) => {
                if (cita.vacio) {
                  return (
                    <tr key={cita.id} className="fila-vacia">
                      <td>{i + 1}</td>
                      <td>{cita.hora}</td>
                      <td colSpan={5} className="tabla-citas-disponible">Disponible</td>
                      <td>
                        <button className="btn-link" onClick={() => abrirFormulario(cita.hora)}>+ Agendar</button>
                      </td>
                    </tr>
                  );
                }
                const confirmado = confirmadoDeEstado(cita.estado);
                const asistio = asistioDeEstado(cita.estado);
                const bloqueado = actualizandoId === cita.id;
                return (
                  <tr key={cita.id} className={cita.estado === 'CANCELADA' ? 'fila-inactiva' : ''}>
                    <td>{i + 1}</td>
                    <td>{cita.hora}</td>
                    <td>{cita.nombre}</td>
                    <td>{cita.rut || '—'}</td>
                    <td>{cita.servicio}</td>
                    <td>
                      {cita.estado === 'CANCELADA' ? (
                        <span className="tabla-citas-cancelada">Cancelada</span>
                      ) : (
                        <ToggleSiNo
                          valor={confirmado}
                          deshabilitado={bloqueado || asistio !== null}
                          onSi={() => marcarConfirmado(cita, true)}
                          onNo={() => marcarConfirmado(cita, false)}
                        />
                      )}
                    </td>
                    <td>{cita.telefono || '—'}</td>
                    <td>
                      {cita.estado === 'CANCELADA' ? (
                        <span className="tabla-citas-cancelada">—</span>
                      ) : (
                        <ToggleSiNo
                          valor={asistio}
                          deshabilitado={bloqueado}
                          onSi={() => marcarAsistio(cita, true)}
                          onNo={() => marcarAsistio(cita, false)}
                        />
                      )}
                    </td>
                    <td className="tabla-citas-acciones-celda">
                      <a href={`/admin/clientes?clienteId=${cita.clienteId}`} className="btn-link">Ver ficha</a>
                      {cita.estado !== 'CANCELADA' && (
                        <button className="btn-link btn-danger" disabled={bloqueado} onClick={() => liberarHora(cita)}>Liberar</button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="tabla-citas-cards">
        {cargando ? (
          <p className="tabla-citas-vacio">Cargando…</p>
        ) : citasFiltradas.length === 0 ? (
          <p className="tabla-citas-vacio">{mensajeVacio}</p>
        ) : (
          citasFiltradas.map((cita, i) => {
            if (cita.vacio) {
              return (
                <div key={cita.id} className="tabla-citas-card">
                  <div className="tabla-citas-card-top">
                    <span className="tabla-citas-card-numero">{i + 1}</span>
                    <span className="tabla-citas-card-hora">{cita.hora}</span>
                    <span className="tabla-citas-disponible">Disponible</span>
                  </div>
                  <button className="btn-link" onClick={() => abrirFormulario(cita.hora)}>+ Agendar esta hora</button>
                </div>
              );
            }
            const confirmado = confirmadoDeEstado(cita.estado);
            const asistio = asistioDeEstado(cita.estado);
            const bloqueado = actualizandoId === cita.id;
            return (
              <div key={cita.id} className={`tabla-citas-card ${cita.estado === 'CANCELADA' ? 'inactiva' : ''}`}>
                <div className="tabla-citas-card-top">
                  <span className="tabla-citas-card-numero">{i + 1}</span>
                  <span className="tabla-citas-card-hora">{cita.hora}</span>
                  <span className="tabla-citas-card-nombre">{cita.nombre}</span>
                </div>
                <div className="tabla-citas-card-detalle">
                  {cita.servicio} · {cita.rut || 'sin rut'} · {cita.telefono || 'sin fono'}
                </div>
                {cita.estado === 'CANCELADA' ? (
                  <span className="tabla-citas-cancelada">Cancelada</span>
                ) : (
                  <div className="tabla-citas-card-acciones">
                    <div className="tabla-citas-card-accion">
                      <span>Confirmado</span>
                      <ToggleSiNo
                        valor={confirmado}
                        deshabilitado={bloqueado || asistio !== null}
                        onSi={() => marcarConfirmado(cita, true)}
                        onNo={() => marcarConfirmado(cita, false)}
                      />
                    </div>
                    <div className="tabla-citas-card-accion">
                      <span>Asistió</span>
                      <ToggleSiNo
                        valor={asistio}
                        deshabilitado={bloqueado}
                        onSi={() => marcarAsistio(cita, true)}
                        onNo={() => marcarAsistio(cita, false)}
                      />
                    </div>
                  </div>
                )}
                <div className="tabla-citas-card-links">
                  <a href={`/admin/clientes?clienteId=${cita.clienteId}`} className="btn-link">Ver ficha</a>
                  {cita.estado !== 'CANCELADA' && (
                    <button className="btn-link btn-danger" disabled={bloqueado} onClick={() => liberarHora(cita)}>Liberar hora</button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
