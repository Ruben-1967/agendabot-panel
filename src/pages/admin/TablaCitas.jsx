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

  function cargarCitas() {
    if (!token) return;
    setCargando(true);
    setError(null);
    // Trae el día completo sin filtrar en el servidor — profesional y
    // servicio se filtran acá abajo sobre esa misma lista, así cambiar de
    // filtro no pide de nuevo al backend.
    fetchCitasDia(token, fecha)
      .then((data) => setCitas(data.citas || []))
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }

  useEffect(cargarCitas, [token, fecha]);

  const citasFiltradas = citas.filter(
    (c) =>
      (!recursoFiltro || c.recursoAgendableId === recursoFiltro) &&
      (!servicioFiltro || c.servicioId === servicioFiltro)
  );

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

  function abrirFormulario() {
    setErrorForm(null);
    setFormHora('');
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
          {servicios.length > 1 && (
            <select value={servicioFiltro} onChange={(e) => setServicioFiltro(e.target.value)}>
              <option value="">Todos los servicios</option>
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          )}
          {profesionales.length > 1 && (
            <select value={recursoFiltro} onChange={(e) => setRecursoFiltro(e.target.value)}>
              <option value="">Todos los profesionales</option>
              {profesionales.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          )}
          <button className="btn-primario" onClick={abrirFormulario}>+ Agregar cita</button>
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
                <select value={formRecursoId} onChange={(e) => setFormRecursoId(e.target.value)} required>
                  <option value="">Elegir…</option>
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
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={8} className="tabla-citas-vacio">Cargando…</td></tr>
            ) : citasFiltradas.length === 0 ? (
              <tr><td colSpan={8} className="tabla-citas-vacio">Sin citas agendadas este día.</td></tr>
            ) : (
              citasFiltradas.map((cita, i) => {
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
          <p className="tabla-citas-vacio">Sin citas agendadas este día.</p>
        ) : (
          citasFiltradas.map((cita, i) => {
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
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
