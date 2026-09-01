import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  fetchConfigClientes,
  fetchClientes,
  fetchCliente,
  crearCliente,
  actualizarCliente,
  registrarVenta,
  editarVenta,
  fetchAtenciones,
  crearAtencion,
  actualizarAtencion,
  eliminarAtencion,
  fetchProfesionales,
} from '../../api/client';
import SimpleDatePicker from '../../components/SimpleDatePicker';
import './Clientes.css';

function formatearFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatearFechaCorta(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate()} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][d.getMonth()]}`;
}

// Convierte un ISO/Date a "YYYY-MM-DD" para inputs type="date"
function aFechaInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function hoyFechaInput() {
  return aFechaInput(new Date().toISOString());
}

function obtenerValorAnidado(obj, path) {
  return path.reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), obj);
}

function setValorAnidado(obj, path, valor) {
  const copia = JSON.parse(JSON.stringify(obj || {}));
  let actual = copia;
  for (let i = 0; i < path.length - 1; i++) {
    const clave = path[i];
    if (typeof actual[clave] !== 'object' || actual[clave] === null) {
      actual[clave] = {};
    }
    actual = actual[clave];
  }
  actual[path[path.length - 1]] = valor;
  return copia;
}

// ------------------------------------------------------------
// Formulario reutilizable de una atención clínica. Los campos propios del
// rubro (receta óptica, ficha estética, ficha de salud, etc.) se arman
// dinámicamente desde RubroTemplate.camposFicha (prop `camposFicha`,
// formato {grupos: [{titulo, campos: [{path, label, tipo, step?,
// placeholder?}]}]}) — nunca hardcodeados a un rubro en particular.
// Diagnóstico/profesional/próxima cita sí son fijos: aplican a cualquier
// rubro por igual. Se usa tanto para crear una atención nueva (tab "Ficha
// clínica") como para editar una existente inline (tab "Historial Clínico").
// ------------------------------------------------------------
function FormularioAtencion({ valores, onCambioFicha, onCambioCampo, camposFicha, profesionales = [], mostrarFecha = true }) {
  const grupos = camposFicha?.grupos || [];
  return (
    <>
      {mostrarFecha && (
        <div className="ficha-seccion">
          <label className="ficha-field">
            <strong>Fecha de esta atención</strong>
            <SimpleDatePicker value={valores.fecha || ''} onChange={(v) => onCambioCampo('fecha', v)} />
          </label>
        </div>
      )}

      {grupos.map((grupo, i) => (
        <div className="ficha-seccion" key={grupo.titulo || i}>
          {grupo.titulo && <h4 className="ficha-seccion-titulo">{grupo.titulo}</h4>}
          <div className="ficha-campos-grid">
            {grupo.campos.map((campo) => (
              <label className="ficha-field" key={campo.path.join('.')}>
                {campo.label}
                <input
                  type={campo.tipo === 'number' ? 'number' : 'text'}
                  step={campo.tipo === 'number' ? campo.step ?? 'any' : undefined}
                  placeholder={campo.placeholder}
                  value={obtenerValorAnidado(valores.fichaJson, campo.path) ?? ''}
                  onChange={(e) => onCambioFicha(campo.path, e.target.value)}
                />
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="ficha-seccion">
        <h4 className="ficha-seccion-titulo">Seguimiento</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label className="ficha-field">
            Diagnóstico
            <input
              type="text"
              placeholder="Diagnóstico o notas de esta atención"
              value={valores.diagnostico || ''}
              onChange={(e) => onCambioCampo('diagnostico', e.target.value)}
            />
          </label>
          <label className="ficha-field">
            Profesional que lo atendió
            <select
              value={valores.profesionalAtendio || ''}
              onChange={(e) => onCambioCampo('profesionalAtendio', e.target.value)}
            >
              <option value="">— Selecciona —</option>
              {profesionales.map((p) => (
                <option key={p.id} value={p.nombre}>{p.nombre}</option>
              ))}
              {/* Registros antiguos escritos a mano que no calzan con ningún
                  profesional actual — se mantienen como opción para no
                  borrar el dato al abrir el formulario. */}
              {valores.profesionalAtendio && !profesionales.some((p) => p.nombre === valores.profesionalAtendio) && (
                <option value={valores.profesionalAtendio}>{valores.profesionalAtendio}</option>
              )}
            </select>
          </label>
          <label className="ficha-field">
            <strong>Fecha de la próxima visita</strong>
            <SimpleDatePicker value={valores.fechaProximaCitaFijada || ''} onChange={(v) => onCambioCampo('fechaProximaCitaFijada', v)} />
          </label>
        </div>
      </div>
    </>
  );
}

export function DetalleCliente({ clienteId, token, categoriasProductoSugeridas, camposFicha, profesionales, onCerrar, onCambio, volverATablaCitas, enTablaCitas }) {
  const nombreRegistro = camposFicha?.nombreRegistro || 'Registro';
  const nombreHistorial = camposFicha?.nombreHistorial || 'Historial';

  const [cliente, setCliente] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [tabActiva, setTabActiva] = useState('datos');

  // ---- Tab Datos ----
  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [fechaProximaCita, setFechaProximaCita] = useState('');
  const [guardandoDatos, setGuardandoDatos] = useState(false);

  // ---- Tab Atenciones (ventas) ----
  const [descripcionVenta, setDescripcionVenta] = useState('');
  const [montoVenta, setMontoVenta] = useState('');
  const [categoriaVenta, setCategoriaVenta] = useState('');
  const [recursoAgendableIdVenta, setRecursoAgendableIdVenta] = useState('');
  const [fechaVenta, setFechaVenta] = useState(() => new Date().toISOString().slice(0, 10));
  const [editandoVentaId, setEditandoVentaId] = useState(null);
  const [fechaEditVenta, setFechaEditVenta] = useState('');
  const [guardandoFechaVenta, setGuardandoFechaVenta] = useState(false);
  const [registrandoVenta, setRegistrandoVenta] = useState(false);

  // ---- Tab Ficha clínica (crea una AtencionClinica nueva) ----
  const [nuevaAtencion, setNuevaAtencion] = useState({
    fecha: hoyFechaInput(),
    fichaJson: {},
    diagnostico: '',
    profesionalAtendio: '',
    fechaProximaCitaFijada: '',
  });
  const [guardandoAtencion, setGuardandoAtencion] = useState(false);

  // ---- Tab Historial Clínico ----
  const [atenciones, setAtenciones] = useState([]);
  const [cargandoAtenciones, setCargandoAtenciones] = useState(false);
  const [edicionAtencionId, setEdicionAtencionId] = useState(null);
  const [atencionEnEdicion, setAtencionEnEdicion] = useState(null);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [eliminandoId, setEliminandoId] = useState(null);

  function cargar() {
    setCargando(true);
    fetchCliente(token, clienteId)
      .then((data) => {
        setCliente(data.cliente);
        setNombre(data.cliente.nombre || '');
        setRut(data.cliente.rut || '');
        setTelefono(data.cliente.telefono || '');
        setEmail(data.cliente.email || '');
        setFechaProximaCita(aFechaInput(data.cliente.fechaProximaCita));

        // Prellenar el formulario de "Ficha clínica" con el último valor
        // conocido (el caché en Cliente), para que el profesional solo
        // edite lo que cambió en esta visita.
        setNuevaAtencion({
          fecha: hoyFechaInput(),
          fichaJson: data.cliente.fichaJson || {},
          diagnostico: data.cliente.diagnostico || '',
          profesionalAtendio: data.cliente.profesionalAtendio || '',
          fechaProximaCitaFijada: aFechaInput(data.cliente.fechaProximaCita),
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }

  function cargarAtenciones() {
    setCargandoAtenciones(true);
    fetchAtenciones(token, clienteId)
      .then((data) => setAtenciones(data.atenciones || []))
      .catch((err) => setError(err.message))
      .finally(() => setCargandoAtenciones(false));
  }

  useEffect(() => {
    cargar();
  }, [clienteId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tabActiva === 'historialClinico') {
      cargarAtenciones();
    }
  }, [tabActiva]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Datos ----
  async function guardarDatos(e) {
    e.preventDefault();
    // Antes había un window.confirm() acá — la intención era solo un
    // recordatorio (ver 2026-08-30), pero en la práctica bloqueaba el
    // guardado completo si el admin hacía clic en "Cancelar" (por reflejo
    // o sin entender el diálogo), dando la sensación de campo obligatorio
    // cuando el backend siempre lo trató como opcional. Reportado por
    // Ahorróptica 2026-09-01 — sacado, el guardado ya no se interrumpe.
    setGuardandoDatos(true);
    setError('');
    try {
      await actualizarCliente(token, clienteId, {
        nombre,
        rut,
        telefono,
        email,
        fechaProximaCita: fechaProximaCita || null,
      });
      cargar();
      onCambio();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardandoDatos(false);
    }
  }

  // ---- Atenciones (ventas) ----
  async function manejarRegistrarVenta(e) {
    e.preventDefault();
    if (!descripcionVenta.trim() || !montoVenta) return;
    setRegistrandoVenta(true);
    setError('');
    try {
        await registrarVenta(token, clienteId, {
        descripcion: descripcionVenta.trim(),
        monto: Number(montoVenta),
        categoriaProducto: categoriaVenta || null,
        recursoAgendableId: recursoAgendableIdVenta || null,
        fecha: fechaVenta,
      });
      setDescripcionVenta('');
      setMontoVenta('');
      setCategoriaVenta('');
      setRecursoAgendableIdVenta('');
      setFechaVenta(new Date().toISOString().slice(0, 10));
      cargar();
      onCambio();
    } catch (err) {
      setError(err.message);
    } finally {
      setRegistrandoVenta(false);
    }
  }

async function guardarFechaVenta(ventaId) {
    if (!fechaEditVenta) return;
    setGuardandoFechaVenta(true);
    setError('');
    try {
      await editarVenta(token, clienteId, ventaId, { fecha: fechaEditVenta });
      setEditandoVentaId(null);
      cargar();
      onCambio();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardandoFechaVenta(false);
    }
  }


  // ---- Ficha clínica: crear atención nueva ----
  function actualizarFichaNuevaAtencion(path, valor) {
    setNuevaAtencion((prev) => ({ ...prev, fichaJson: setValorAnidado(prev.fichaJson, path, valor) }));
  }
  function actualizarCampoNuevaAtencion(campo, valor) {
    setNuevaAtencion((prev) => ({ ...prev, [campo]: valor }));
  }

  async function guardarNuevaAtencion(e) {
    e.preventDefault();
    // Mismo caso que guardarDatos() más arriba — el confirm() bloqueaba el
    // guardado si se cancelaba, aunque el campo siempre fue opcional.
    setGuardandoAtencion(true);
    setError('');
    try {
      await crearAtencion(token, clienteId, {
        fecha: nuevaAtencion.fecha,
        fichaJson: nuevaAtencion.fichaJson,
        diagnostico: nuevaAtencion.diagnostico || null,
        profesionalAtendio: nuevaAtencion.profesionalAtendio || null,
        fechaProximaCitaFijada: nuevaAtencion.fechaProximaCitaFijada || null,
      });
      cargar();
      if (tabActiva === 'historialClinico') cargarAtenciones();
      onCambio();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardandoAtencion(false);
    }
  }

  // ---- Historial Clínico: editar / guardar / eliminar por registro ----
  function iniciarEdicion(atencion) {
    setEdicionAtencionId(atencion.id);
    setAtencionEnEdicion({
      fecha: aFechaInput(atencion.fecha),
      fichaJson: atencion.fichaJson || {},
      diagnostico: atencion.diagnostico || '',
      profesionalAtendio: atencion.profesionalAtendio || '',
      fechaProximaCitaFijada: aFechaInput(atencion.fechaProximaCitaFijada),
    });
  }

  function cancelarEdicion() {
    setEdicionAtencionId(null);
    setAtencionEnEdicion(null);
  }

  function actualizarFichaEdicion(path, valor) {
    setAtencionEnEdicion((prev) => ({ ...prev, fichaJson: setValorAnidado(prev.fichaJson, path, valor) }));
  }
  function actualizarCampoEdicion(campo, valor) {
    setAtencionEnEdicion((prev) => ({ ...prev, [campo]: valor }));
  }

  async function guardarEdicion(atencionId) {
    setGuardandoEdicion(true);
    setError('');
    try {
      await actualizarAtencion(token, clienteId, atencionId, {
        fecha: atencionEnEdicion.fecha,
        fichaJson: atencionEnEdicion.fichaJson,
        diagnostico: atencionEnEdicion.diagnostico || null,
        profesionalAtendio: atencionEnEdicion.profesionalAtendio || null,
        fechaProximaCitaFijada: atencionEnEdicion.fechaProximaCitaFijada || null,
      });
      cancelarEdicion();
      cargarAtenciones();
      cargar();
      onCambio();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardandoEdicion(false);
    }
  }

  async function manejarEliminar(atencion) {
    const fechaLegible = formatearFecha(atencion.fecha);
    const confirmado = window.confirm(
      `¿Eliminar la atención del ${fechaLegible}? Esta acción no se puede deshacer.`
    );
    if (!confirmado) return;

    setEliminandoId(atencion.id);
    setError('');
    try {
      await eliminarAtencion(token, clienteId, atencion.id);
      cargarAtenciones();
      cargar();
      onCambio();
    } catch (err) {
      setError(err.message);
    } finally {
      setEliminandoId(null);
    }
  }

  if (cargando) return <div className="cliente-detalle-cargando">Cargando…</div>;
  if (!cliente) return null;

  return (
    <div className="cliente-detalle-panel">
      {enTablaCitas ? (
        // Ya estamos en Tabla de citas (panel embebido, no hubo navegación
        // real) — "volver" es solo cerrar, nunca un <a href> que recargaría
        // la página entera y perdería la fecha/filtros ya elegidos.
        <button type="button" className="btn-volver-tabla-citas" onClick={onCerrar}>← Volver a la tabla de citas</button>
      ) : volverATablaCitas && (
        <a href="/admin/tabla-citas" className="btn-volver-tabla-citas">← Volver a la tabla de citas</a>
      )}
      <div className="cliente-detalle-header">
        <h3>{cliente.nombre}</h3>
        <button type="button" className="btn-cerrar" onClick={onCerrar}>✕</button>
      </div>

      {error && <div className="mensaje-error">{error}</div>}

      <div className="cliente-tabs">
        <button
          type="button"
          className={`tab ${tabActiva === 'datos' ? 'active' : ''}`}
          onClick={() => setTabActiva('datos')}
        >
          Datos
        </button>
        <button
          type="button"
          className={`tab ${tabActiva === 'atenciones' ? 'active' : ''}`}
          onClick={() => setTabActiva('atenciones')}
        >
          Atenciones
        </button>
        <button
          type="button"
          className={`tab ${tabActiva === 'fichaClinica' ? 'active' : ''}`}
          onClick={() => setTabActiva('fichaClinica')}
        >
          {nombreRegistro}
        </button>
        <button
          type="button"
          className={`tab ${tabActiva === 'historialClinico' ? 'active' : ''}`}
          onClick={() => setTabActiva('historialClinico')}
        >
          {nombreHistorial}
        </button>
      </div>

      {/* TAB: DATOS */}
      {tabActiva === 'datos' && (
        <form className="cliente-tab-content" onSubmit={guardarDatos}>
          <div className="form-group">
            <label>Nombre</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>RUT</label>
            <input value={rut} onChange={(e) => setRut(e.target.value)} placeholder="12345678-9" />
          </div>
          <div className="form-group">
            <label>Teléfono</label>
            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Fecha de la próxima visita</label>
            <SimpleDatePicker value={fechaProximaCita} onChange={setFechaProximaCita} />
          </div>
          <button type="submit" disabled={guardandoDatos} className="btn-guardar">
            {/* Antes decía "Registrar atención" — un texto de otra pestaña
                (Atenciones/ventas) que no tiene nada que ver con editar los
                datos del paciente acá. Reportado por Ahorróptica: nadie
                reconocía este botón como el que guarda sus cambios. */}
            {guardandoDatos ? 'Guardando…' : 'Guardar datos'}
          </button>
        </form>
      )}

      {/* TAB: ATENCIONES (ventas) */}
      {tabActiva === 'atenciones' && (
        <div className="cliente-tab-content">
          <div className="historial-seccion">
            <h4 className="historial-titulo">Nueva venta/atención</h4>
            <form className="historial-form-inline" onSubmit={manejarRegistrarVenta}>
              <input
                placeholder="Descripción (ej. Lentes Ray-Ban)"
                value={descripcionVenta}
                onChange={(e) => setDescripcionVenta(e.target.value)}
                required
              />
              <SimpleDatePicker value={fechaVenta} onChange={setFechaVenta} />
              <input
                type="number"
                min="0"
                placeholder="Monto CLP"
                value={montoVenta}
                onChange={(e) => setMontoVenta(e.target.value)}
                required
              />
              {categoriasProductoSugeridas.length > 0 && (
                <select
                  value={categoriaVenta}
                  onChange={(e) => setCategoriaVenta(e.target.value)}
                >
                  <option value="">Categoría (opt.)</option>
                  {categoriasProductoSugeridas.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              )}
              {profesionales.length > 0 && (
                <select
                  value={recursoAgendableIdVenta}
                  onChange={(e) => setRecursoAgendableIdVenta(e.target.value)}
                >
                  <option value="">Profesional (opt.)</option>
                  {profesionales.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              )}
              <button type="submit" disabled={registrandoVenta} className="btn-guardar">
                {registrandoVenta ? 'Registrando…' : 'Registrar atención'}
              </button>
            </form>
          </div>

          <div className="historial-seccion">
            <h4 className="historial-titulo">Todas las transacciones</h4>
            {cliente.ventas.length === 0 ? (
              <p className="texto-vacio">Sin ventas registradas.</p>
            ) : (
              <div className="historial-items">
              {cliente.ventas.map((v) => (
                  <div key={v.id} className="historial-item">
                    {editandoVentaId === v.id ? (
                      <>
                        <SimpleDatePicker value={fechaEditVenta} onChange={setFechaEditVenta} />
                        <button
                          type="button"
                          disabled={guardandoFechaVenta}
                          onClick={() => guardarFechaVenta(v.id)}
                        >
                          {guardandoFechaVenta ? 'Guardando…' : 'Guardar'}
                        </button>
                        <button type="button" onClick={() => setEditandoVentaId(null)}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <div
                        className="historial-item-fecha"
                        style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}
                        title="Clic para editar la fecha"
                        onClick={() => {
                          setEditandoVentaId(v.id);
                          setFechaEditVenta(new Date(v.fecha || v.creadoEn).toISOString().slice(0, 10));
                        }}
                      >
                        {formatearFecha(v.fecha || v.creadoEn)}
                      </div>
                    )}
                    <div className="historial-item-desc">{v.descripcion}</div>
                    {v.categoriaProducto && (
                      <div className="historial-item-badge">{v.categoriaProducto}</div>
                    )}
                    <div className="historial-item-monto">${v.monto.toLocaleString('es-CL')}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: FICHA CLÍNICA (crea una atención nueva) */}
      {tabActiva === 'fichaClinica' && (
        <form className="cliente-tab-content cliente-ficha-form" onSubmit={guardarNuevaAtencion}>
          <p className="texto-muted" style={{ marginBottom: '12px' }}>
            Guardar esto lo agrega como un nuevo registro a {nombreHistorial} — no
            sobrescribe los anteriores.
          </p>
          <FormularioAtencion
            valores={nuevaAtencion}
            onCambioFicha={actualizarFichaNuevaAtencion}
            onCambioCampo={actualizarCampoNuevaAtencion}
            camposFicha={camposFicha}
            profesionales={profesionales}
          />
          <button type="submit" disabled={guardandoAtencion} className="btn-guardar">
            {guardandoAtencion ? 'Guardando…' : 'Registrar atención'}
          </button>
        </form>
      )}

      {/* TAB: HISTORIAL CLÍNICO */}
      {tabActiva === 'historialClinico' && (
        <div className="cliente-tab-content">
          {cargandoAtenciones ? (
            <p className="texto-muted">Cargando…</p>
          ) : atenciones.length === 0 ? (
            <p className="texto-vacio">Sin atenciones registradas todavía.</p>
          ) : (
            <div className="historial-items">
              {atenciones.map((a) => {
                const enEdicion = edicionAtencionId === a.id;
                return (
                  <div key={a.id} className="historial-item-clinico">
                    {enEdicion ? (
                      <div className="cliente-ficha-form">
                        <FormularioAtencion
                          valores={atencionEnEdicion}
                          onCambioFicha={actualizarFichaEdicion}
                          onCambioCampo={actualizarCampoEdicion}
                          camposFicha={camposFicha}
                          profesionales={profesionales}
                        />
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                          <button
                            type="button"
                            className="btn-guardar"
                            disabled={guardandoEdicion}
                            onClick={() => guardarEdicion(a.id)}
                          >
                            {guardandoEdicion ? 'Guardando…' : 'Guardar'}
                          </button>
                          <button type="button" className="btn-cancelar" onClick={cancelarEdicion}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="historial-item-clinico-header">
                          <span className="historial-item-fecha">{formatearFecha(a.fecha)}</span>
                          <div className="historial-item-clinico-acciones">
                            <button type="button" className="btn-accion" onClick={() => iniciarEdicion(a)}>
                              Editar
                            </button>
                            <button
                              type="button"
                              className="btn-accion btn-accion-eliminar"
                              disabled={eliminandoId === a.id}
                              onClick={() => manejarEliminar(a)}
                            >
                              {eliminandoId === a.id ? 'Eliminando…' : 'Eliminar'}
                            </button>
                          </div>
                        </div>
                        <div className="historial-item-clinico-body">
                          {a.diagnostico && <p><strong>Diagnóstico:</strong> {a.diagnostico}</p>}
                          {a.profesionalAtendio && <p><strong>Profesional:</strong> {a.profesionalAtendio}</p>}
                          {a.fechaProximaCitaFijada && (
                            <p><strong>Fecha de la próxima visita:</strong> {formatearFecha(a.fechaProximaCitaFijada)}</p>
                          )}
                          <div className="historial-item-clinico-receta">
                            {(camposFicha?.grupos || []).map((grupo, i) => (
                              <div key={grupo.titulo || i}>
                                {grupo.titulo && <span className="receta-ojo-label">{grupo.titulo}</span>}
                                {grupo.campos.map((campo) => (
                                  <span key={campo.path.join('.')}>
                                    {campo.label}: {obtenerValorAnidado(a.fichaJson, campo.path) ?? '—'}
                                  </span>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Clientes() {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  // Deep link desde "Tabla de citas" (?clienteId=...) — abre la ficha
  // directo al entrar, sin que el admin tenga que buscarlo en la lista.
  const clienteIdDesdeUrl = searchParams.get('clienteId');
  const [clientes, setClientes] = useState([]);
  const [categoriasProductoSugeridas, setCategoriasProductoSugeridas] = useState([]);
  const [camposFicha, setCamposFicha] = useState({ grupos: [] });
  const [profesionales, setProfesionales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState(clienteIdDesdeUrl);
  const [busqueda, setBusqueda] = useState('');

  const [nombreNuevo, setNombreNuevo] = useState('');
  const [rutNuevo, setRutNuevo] = useState('');
  const [telefonoNuevo, setTelefonoNuevo] = useState('');
  const [creando, setCreando] = useState(false);

  function cargar() {
    setCargando(true);
    Promise.all([fetchClientes(token), fetchConfigClientes(token), fetchProfesionales(token)])
      .then(([dataClientes, dataConfig, dataProfesionales]) => {
        setClientes(dataClientes.clientes);
        setCategoriasProductoSugeridas(dataConfig.categoriasProductoSugeridas || []);
        setCamposFicha(dataConfig.camposFicha || { grupos: [] });
        setProfesionales(dataProfesionales.profesionales || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    cargar();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clientesFiltrados = (() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return clientes;
    return clientes.filter((c) => (
      c.nombre?.toLowerCase().includes(termino)
      || c.rut?.toLowerCase().includes(termino)
      || c.telefono?.toLowerCase().includes(termino)
    ));
  })();

  async function manejarCrear(e) {
    e.preventDefault();
    if (!nombreNuevo.trim()) return;
    setCreando(true);
    setError('');
    try {
      const data = await crearCliente(token, {
        nombre: nombreNuevo,
        rut: rutNuevo,
        telefono: telefonoNuevo,
      });
      setNombreNuevo('');
      setRutNuevo('');
      setTelefonoNuevo('');
      cargar();
      setClienteSeleccionadoId(data.cliente.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreando(false);
    }
  }

  return (
    <div className="clientes-container">
      <div className="clientes-header">
        <h1>
          <span className="clientes-titulo-pacientes">Pacientes</span>
          <span className="clientes-titulo-slash">/</span>
          <span className="clientes-titulo-clientes">Clientes</span>
        </h1>
        <p className="clientes-sub">
          Carga y administra fichas de pacientes/clientes, y registra ventas y atenciones clínicas.
        </p>
      </div>

      {error && <div className="mensaje-error">{error}</div>}

      <form className="clientes-form-nuevo" onSubmit={manejarCrear}>
        <input
          placeholder="Nombre completo"
          value={nombreNuevo}
          onChange={(e) => setNombreNuevo(e.target.value)}
          required
        />
        <input
          placeholder="RUT (opcional)"
          value={rutNuevo}
          onChange={(e) => setRutNuevo(e.target.value)}
        />
        <input
          placeholder="Teléfono (opcional)"
          value={telefonoNuevo}
          onChange={(e) => setTelefonoNuevo(e.target.value)}
        />
        <button type="submit" disabled={creando}>
          {creando ? 'Creando…' : '+ Nuevo paciente/cliente'}
        </button>
      </form>

      {!cargando && clientes.length > 0 && (
        <input
          type="search"
          className="clientes-buscador"
          placeholder="Buscar por nombre, RUT o teléfono…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      )}

      {cargando ? (
        <div className="clientes-loading">Cargando…</div>
      ) : clientes.length === 0 ? (
        <div className="clientes-vacio">No hay pacientes/clientes todavía.</div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="clientes-vacio">Ningún paciente/cliente coincide con "{busqueda}".</div>
      ) : (
        <div className="clientes-lista">
          {clientesFiltrados.map((c) => (
            <div
              key={c.id}
              className="cliente-card"
              onClick={() => setClienteSeleccionadoId(c.id)}
            >
              <div className="cliente-card-header">
                <div className="cliente-card-info">
                  <h3 className="cliente-card-nombre">{c.nombre}</h3>
                  <p className="cliente-card-meta">
                    Última visita:{' '}
                    {c.ultimaCompraFecha ? formatearFechaCorta(c.ultimaCompraFecha) : '—'}
                  </p>
                  <p className="cliente-card-meta">
                    Fecha de la próxima visita:{' '}
                    {c.fechaProximaCita ? formatearFechaCorta(c.fechaProximaCita) : '—'}
                  </p>
                  {c.numVentas > 0 && (
                    <span className="cliente-card-badge">
                      {c.numVentas} {c.numVentas === 1 ? 'venta' : 'ventas'}
                    </span>
                  )}
                </div>
                <div className="cliente-card-venta">
                  <p className="cliente-card-monto">
                    ${c.totalGastado.toLocaleString('es-CL')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {clienteSeleccionadoId && (
        <DetalleCliente
          clienteId={clienteSeleccionadoId}
          token={token}
          categoriasProductoSugeridas={categoriasProductoSugeridas}
          camposFicha={camposFicha}
          profesionales={profesionales}
          onCerrar={() => setClienteSeleccionadoId(null)}
          onCambio={cargar}
          volverATablaCitas={clienteSeleccionadoId === clienteIdDesdeUrl}
        />
      )}
    </div>
  );
}
