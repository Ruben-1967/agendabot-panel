import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVendedorAuth } from '../../context/VendedorAuthContext';
import { fetchProspectosDemo, eliminarProspectoDemo, convertirClienteReal, fetchClientesConvertidos, eliminarClienteConvertido, editarPlanCliente, fetchVendedoresKPI, fetchKpisDiarios } from '../../api/client';
import NavVendedor from './NavVendedor';
import './vendedor.css';

function formatearFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

// "Hoy" en hora de Chile, no la del navegador — mismo criterio que el
// default del backend (ver GET /demos/kpis-diarios).
function hoyEnChile() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
}

const ETIQUETA_SLA = { ROJO: '🔴 Vencido', AMARILLO: '🟡 Por vencer', OK: '⚪ Al día' };
const ETIQUETA_TIPO_LEAD = { CALIENTE: 'Caliente', FRIO: 'Frío' };
const ETIQUETA_FASE = { primer_contacto: 'sin primer contacto', aging: 'sin avance' };

// Mismos valores que PLANES en src/services/contratoHtml.js (backend) — solo
// para mostrar precio en el selector del modal, el backend es la fuente de
// verdad real al crear la Suscripcion.
const PLANES = {
  A: { etiqueta: 'Plan A', montoMensual: 9900 },
  B: { etiqueta: 'Plan B', montoMensual: 19900 },
  C: { etiqueta: 'Plan C', montoMensual: 49900 },
};

const ETIQUETA_ESTADO_SUSCRIPCION = { PENDIENTE_PAGO: 'Pendiente de pago', ACTIVA: 'Activa', SUSPENDIDA: 'Suspendida' };

function formatoCLP(n) {
  if (n == null) return '—';
  return `$${n.toLocaleString('es-CL')}`;
}

function ModalConvertirCliente({ demo, token, onCerrar, onConvertido }) {
  const [email, setEmail] = useState(demo.email || '');
  const [plan, setPlan] = useState('A');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  async function manejarGuardar(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const resultado = await convertirClienteReal(token, demo.id, { email: email.trim(), plan });
      onConvertido(resultado);
    } catch (err) {
      setError(err.message || 'No se pudo convertir a cliente real');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="modal-vendedor-overlay" onClick={onCerrar}>
      <div className="modal-vendedor-caja" onClick={(e) => e.stopPropagation()}>
        <h3>Convertir "{demo.nombreNegocio}" a cliente real</h3>
        <p className="texto-ayuda">
          Se creará la cuenta con este plan y se le enviará por WhatsApp un link para que defina su propia
          contraseña — la contraseña la elige el negocio, nunca queda en tus manos.
        </p>
        <form onSubmit={manejarGuardar} className="form-vendedor">
          <label>
            Email del negocio
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="contacto@negocio.cl"
            />
          </label>
          <label>
            Plan
            <select value={plan} onChange={(e) => setPlan(e.target.value)}>
              {Object.entries(PLANES).map(([clave, p]) => (
                <option key={clave} value={clave}>{p.etiqueta} — {formatoCLP(p.montoMensual)}/mes</option>
              ))}
            </select>
          </label>
          {error && <p className="login-error">{error}</p>}
          <div className="tarjeta-demo-acciones">
            <button type="submit" className="cta-primaria" disabled={enviando}>
              {enviando ? 'Convirtiendo…' : 'Convertir a cliente real'}
            </button>
            <button type="button" className="btn-link" onClick={onCerrar} disabled={enviando}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalEditarPlan({ cliente, token, onCerrar, onGuardado }) {
  const [plan, setPlan] = useState(cliente.plan ? cliente.plan.replace('PLAN_', '') : 'A');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  async function manejarGuardar(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const resultado = await editarPlanCliente(token, cliente.empresaId, plan);
      onGuardado(resultado);
    } catch (err) {
      setError(err.message || 'No se pudo cambiar el plan');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="modal-vendedor-overlay" onClick={onCerrar}>
      <div className="modal-vendedor-caja" onClick={(e) => e.stopPropagation()}>
        <h3>Cambiar plan de "{cliente.nombre}"</h3>
        <form onSubmit={manejarGuardar} className="form-vendedor">
          <label>
            Plan
            <select value={plan} onChange={(e) => setPlan(e.target.value)}>
              {Object.entries(PLANES).map(([clave, p]) => (
                <option key={clave} value={clave}>{p.etiqueta} — {formatoCLP(p.montoMensual)}/mes</option>
              ))}
            </select>
          </label>
          {error && <p className="login-error">{error}</p>}
          <div className="tarjeta-demo-acciones">
            <button type="submit" className="cta-primaria" disabled={enviando}>
              {enviando ? 'Guardando…' : 'Guardar plan'}
            </button>
            <button type="button" className="btn-link" onClick={onCerrar} disabled={enviando}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MisDemos() {
  const { token, vendedor } = useVendedorAuth();
  const navigate = useNavigate();
  const esAdmin = vendedor?.rol === 'ADMIN';

  const [demos, setDemos] = useState([]);
  const [contadorVencidos, setContadorVencidos] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [eliminandoId, setEliminandoId] = useState(null);

  const [filtroEstadoSLA, setFiltroEstadoSLA] = useState('');
  const [filtroTipoLead, setFiltroTipoLead] = useState('');
  const [filtroVendedorId, setFiltroVendedorId] = useState('todos');

  const [vendedoresKPI, setVendedoresKPI] = useState([]);
  const [avisoLinkManual, setAvisoLinkManual] = useState(null);
  const [modalConvertir, setModalConvertir] = useState(null); // null = cerrado, demo = abierto para esa demo

  const [pestanaActiva, setPestanaActiva] = useState('demos'); // 'demos' | 'clientes'
  const [clientes, setClientes] = useState([]);
  const [cargandoClientes, setCargandoClientes] = useState(false);
  const [errorClientes, setErrorClientes] = useState('');
  const [eliminandoClienteId, setEliminandoClienteId] = useState(null);
  const [modalEditarPlan, setModalEditarPlan] = useState(null); // null = cerrado, cliente = abierto

  const [desdeKpiDiario, setDesdeKpiDiario] = useState(hoyEnChile());
  const [hastaKpiDiario, setHastaKpiDiario] = useState(hoyEnChile());
  const [kpisDiarios, setKpisDiarios] = useState(null);
  const [cargandoKpisDiarios, setCargandoKpisDiarios] = useState(true);
  const [errorKpisDiarios, setErrorKpisDiarios] = useState('');

  function cargar() {
    setCargando(true);
    fetchProspectosDemo(token, { estadoSLA: filtroEstadoSLA, tipoLead: filtroTipoLead, vendedorId: esAdmin ? filtroVendedorId : undefined })
      .then((data) => {
        setDemos(data.demos || []);
        setContadorVencidos(data.contadorVencidos || 0);
      })
      .catch((err) => setError(err.message || 'No se pudo cargar el listado'))
      .finally(() => setCargando(false));
  }

  useEffect(() => { cargar(); }, [token, filtroEstadoSLA, filtroTipoLead, filtroVendedorId]); // eslint-disable-line react-hooks/exhaustive-deps

  function cargarClientes() {
    setCargandoClientes(true);
    setErrorClientes('');
    fetchClientesConvertidos(token, { vendedorId: esAdmin ? filtroVendedorId : undefined })
      .then((data) => setClientes(data.clientes || []))
      .catch((err) => setErrorClientes(err.message || 'No se pudo cargar el listado de clientes'))
      .finally(() => setCargandoClientes(false));
  }

  useEffect(() => {
    if (pestanaActiva !== 'clientes') return;
    cargarClientes();
  }, [token, pestanaActiva, filtroVendedorId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!esAdmin) return;
    fetchVendedoresKPI(token)
      .then((data) => setVendedoresKPI(data.vendedores || []))
      .catch(() => {}); // los KPIs son un extra — si fallan, no bloquean el listado principal
  }, [token, esAdmin]);

  useEffect(() => {
    setCargandoKpisDiarios(true);
    setErrorKpisDiarios('');
    fetchKpisDiarios(token, { desde: desdeKpiDiario, hasta: hastaKpiDiario, vendedorId: esAdmin ? filtroVendedorId : undefined })
      .then((data) => setKpisDiarios(data))
      .catch((err) => setErrorKpisDiarios(err.message || 'No se pudo cargar los KPIs de gestión diaria'))
      .finally(() => setCargandoKpisDiarios(false));
  }, [token, desdeKpiDiario, hastaKpiDiario, esAdmin, filtroVendedorId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function manejarEliminar(demo) {
    const confirmado = window.confirm(
      `¿Eliminar la demo de "${demo.nombreNegocio}" (${demo.telefono})? El teléfono queda libre de inmediato para una demo nueva — el historial se conserva internamente para reportes futuros.`
    );
    if (!confirmado) return;

    setEliminandoId(demo.id);
    setError('');
    try {
      await eliminarProspectoDemo(token, demo.id);
      setDemos((prev) => prev.filter((d) => d.id !== demo.id));
    } catch (err) {
      setError(err.message || 'No se pudo eliminar la demo');
    } finally {
      setEliminandoId(null);
    }
  }

  function manejarConvertido(demo, resultado) {
    // Se muestra siempre, no solo cuando whatsappEnviado es false: que la API
    // de Meta no haya tirado error no garantiza que el mensaje haya llegado
    // de verdad al teléfono del prospecto (ej. número sin una app de
    // WhatsApp real detrás), así que el link queda visible como respaldo en
    // los dos casos.
    setAvisoLinkManual({
      nombreNegocio: demo.nombreNegocio,
      link: resultado.linkActivacion,
      whatsappEnviado: resultado.whatsappEnviado,
    });
    setModalConvertir(null);
    cargar();
    if (pestanaActiva === 'clientes') cargarClientes();
  }

  async function manejarEliminarCliente(cliente) {
    const confirmado = window.confirm(
      `¿Eliminar por completo a "${cliente.nombre}"? Se borra la empresa, su usuario, la suscripción y la demo que la originó — no se puede deshacer. Pensado solo para limpiar pruebas, no para clientes reales.`
    );
    if (!confirmado) return;

    setEliminandoClienteId(cliente.empresaId);
    setErrorClientes('');
    try {
      await eliminarClienteConvertido(token, cliente.empresaId);
      setClientes((prev) => prev.filter((c) => c.empresaId !== cliente.empresaId));
    } catch (err) {
      setErrorClientes(err.message || 'No se pudo eliminar el cliente');
    } finally {
      setEliminandoClienteId(null);
    }
  }

  function manejarPlanGuardado(resultado) {
    setClientes((prev) => prev.map((c) => (
      c.empresaId === modalEditarPlan.empresaId
        ? { ...c, plan: resultado.suscripcion.plan, montoMensualActual: resultado.suscripcion.montoMensualActual }
        : c
    )));
    setModalEditarPlan(null);
  }

  async function copiarLinkManual() {
    if (!avisoLinkManual) return;
    try {
      await navigator.clipboard.writeText(avisoLinkManual.link);
    } catch {
      // si el navegador bloquea el clipboard, el link ya está visible para copiar a mano
    }
  }

  // KPI a mostrar: del vendedor seleccionado, o la suma de todos si el
  // filtro está en "todos".
  const kpiMostrado = (() => {
    if (vendedoresKPI.length === 0) return null;
    if (filtroVendedorId !== 'todos') {
      return vendedoresKPI.find((v) => v.vendedorId === filtroVendedorId) || null;
    }
    return vendedoresKPI.reduce(
      (acc, v) => ({
        total: acc.total + v.total,
        rojo: acc.rojo + v.rojo,
        amarillo: acc.amarillo + v.amarillo,
        ok: acc.ok + v.ok,
        conversionesMes: acc.conversionesMes + v.conversionesMes,
      }),
      { total: 0, rojo: 0, amarillo: 0, ok: 0, conversionesMes: 0 }
    );
  })();

  return (
    <div className="pantalla-vendedor">
      <NavVendedor />
      <div className="vendedor-inner">
        <h1>Mis casos</h1>

        {contadorVencidos > 0 && (
          <span className="badge-vencidos">🔴 {contadorVencidos} lead{contadorVencidos === 1 ? '' : 's'} vencido{contadorVencidos === 1 ? '' : 's'}</span>
        )}

        {avisoLinkManual && (
          <div className="aviso-link-manual">
            <p>
              {avisoLinkManual.whatsappEnviado ? (
                <>
                  <strong>{avisoLinkManual.nombreNegocio}</strong> se convirtió a cliente real y se envió el WhatsApp
                  automático. Si el mensaje no le llega (puede pasar si el número no tiene un WhatsApp real detrás),
                  compartile este link a mano:
                </>
              ) : (
                <>
                  El WhatsApp automático para <strong>{avisoLinkManual.nombreNegocio}</strong> no se pudo enviar (fuera de
                  la ventana de 24h de WhatsApp). Compartile este link a mano:
                </>
              )}
            </p>
            <div className="aviso-link-manual-fila">
              <code>{avisoLinkManual.link}</code>
              <button className="cta-secundaria" onClick={copiarLinkManual}>Copiar</button>
            </div>
            <button className="btn-link" onClick={() => setAvisoLinkManual(null)}>Cerrar</button>
          </div>
        )}

        {esAdmin && (
          <div className="barra-filtros">
            <select value={filtroVendedorId} onChange={(e) => setFiltroVendedorId(e.target.value)}>
              <option value="todos">Todos los vendedores</option>
              {vendedoresKPI.map((v) => (
                <option key={v.vendedorId} value={v.vendedorId}>{v.nombre}{!v.activo ? ' (Bloqueado)' : ''}</option>
              ))}
            </select>
          </div>
        )}

        {esAdmin && filtroVendedorId !== 'todos' && vendedoresKPI.find((v) => v.vendedorId === filtroVendedorId)?.activo === false && (
          <p className="login-error" style={{ margin: '0 0 12px' }}>Este vendedor está bloqueado — no puede iniciar sesión, pero sus casos siguen visibles acá.</p>
        )}

        {esAdmin && kpiMostrado && (
          <div className="kpi-vendedor">
            <div><strong>{kpiMostrado.total}</strong><span>casos activos</span></div>
            <div><strong>{kpiMostrado.rojo}</strong><span>🔴 vencidos</span></div>
            <div><strong>{kpiMostrado.amarillo}</strong><span>🟡 por vencer</span></div>
            <div><strong>{kpiMostrado.ok}</strong><span>⚪ al día</span></div>
            <div><strong>{kpiMostrado.conversionesMes}</strong><span>conversiones este mes</span></div>
          </div>
        )}

        <h2 className="subtitulo">Actividad por rango de fecha</h2>
        <div className="barra-filtros">
          <label className="filtro-fecha">
            Desde
            <input type="date" value={desdeKpiDiario} max={hastaKpiDiario} onChange={(e) => setDesdeKpiDiario(e.target.value)} />
          </label>
          <label className="filtro-fecha">
            Hasta
            <input type="date" value={hastaKpiDiario} min={desdeKpiDiario} max={hoyEnChile()} onChange={(e) => setHastaKpiDiario(e.target.value)} />
          </label>
          {(desdeKpiDiario !== hoyEnChile() || hastaKpiDiario !== hoyEnChile()) && (
            <button
              type="button"
              className="btn-link"
              onClick={() => { setDesdeKpiDiario(hoyEnChile()); setHastaKpiDiario(hoyEnChile()); }}
            >
              Volver a hoy
            </button>
          )}
        </div>

        {errorKpisDiarios && <p className="login-error">{errorKpisDiarios}</p>}

        {!cargandoKpisDiarios && kpisDiarios && (
          <div className="kpi-vendedor" style={{ marginBottom: 20 }}>
            <div><strong>{kpisDiarios.demosCreadas}</strong><span>demos creadas</span></div>
            <div><strong>{kpisDiarios.negociosQueProbaron}</strong><span>negocios que probaron</span></div>
            <div><strong>{kpisDiarios.negociosGestionados}</strong><span>negocios gestionados</span></div>
            <div><strong>{kpisDiarios.conversiones}</strong><span>conversiones del período</span></div>
          </div>
        )}

        <div className="barra-filtros">
          <button
            type="button"
            className={pestanaActiva === 'demos' ? 'cta-primaria' : 'cta-secundaria'}
            onClick={() => setPestanaActiva('demos')}
          >
            Mis casos
          </button>
          <button
            type="button"
            className={pestanaActiva === 'clientes' ? 'cta-primaria' : 'cta-secundaria'}
            onClick={() => setPestanaActiva('clientes')}
          >
            Clientes
          </button>
        </div>

        {pestanaActiva === 'demos' && (
          <>
            <div className="barra-filtros">
              <select value={filtroEstadoSLA} onChange={(e) => setFiltroEstadoSLA(e.target.value)}>
                <option value="">Todos los estados</option>
                <option value="ROJO">🔴 Vencidos</option>
                <option value="AMARILLO">🟡 Por vencer</option>
                <option value="OK">⚪ Al día</option>
              </select>
              <select value={filtroTipoLead} onChange={(e) => setFiltroTipoLead(e.target.value)}>
                <option value="">Caliente y frío</option>
                <option value="CALIENTE">Solo calientes</option>
                <option value="FRIO">Solo fríos</option>
              </select>
            </div>

            {error && <p className="login-error">{error}</p>}
            {cargando && <p>Cargando…</p>}

            {!cargando && (
              <p className="texto-ayuda" style={{ margin: '0 0 8px' }}>
                Mostrando {demos.length} caso{demos.length === 1 ? '' : 's'}
              </p>
            )}

            {!cargando && demos.length === 0 && (
              <p className="texto-ayuda">No hay casos que calcen con este filtro.</p>
            )}

            <ul className="lista-demos">
              {demos.map((d) => (
                <li key={d.id} className="tarjeta-demo">
                  <div className="tarjeta-demo-header">
                    <strong>{d.nombreNegocio}</strong>
                    <div className="tarjeta-demo-badges">
                      <span className={`badge-sla badge-sla-${d.estadoSLA.toLowerCase()}`}>
                        {ETIQUETA_SLA[d.estadoSLA]}
                      </span>
                      <span className={d.yaProbo ? 'badge-exito' : 'badge-pendiente'}>
                        {d.yaProbo ? '✓ Probó' : 'No ha probado'}
                      </span>
                    </div>
                  </div>
                  <p>{d.nombreEncargado} · {d.telefono}</p>
                  <p className="texto-ayuda">{d.rubro} · {ETIQUETA_TIPO_LEAD[d.tipoLead]} · {d.diasEnEstado} día{d.diasEnEstado === 1 ? '' : 's'} {ETIQUETA_FASE[d.fase]}</p>
                  <p className="texto-ayuda">
                    Cargada: {formatearFecha(d.creadoEn)}
                    {esAdmin && d.vendedorNombre && ` · Vendedor: ${d.vendedorNombre}`}
                  </p>

                  <div className="tarjeta-demo-acciones">
                    <button
                      className="cta-secundaria"
                      onClick={() => navigate(`/vendedor/gestion/${d.id}`, { state: { demo: d } })}
                    >
                      Gestionar
                    </button>
                    <button
                      className="cta-secundaria"
                      onClick={() => setModalConvertir(d)}
                    >
                      Convertir a cliente real
                    </button>
                    <button
                      className="btn-link btn-danger"
                      onClick={() => manejarEliminar(d)}
                      disabled={eliminandoId === d.id}
                    >
                      {eliminandoId === d.id ? 'Eliminando…' : 'Eliminar'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {pestanaActiva === 'clientes' && (
          <>
            {errorClientes && <p className="login-error">{errorClientes}</p>}
            {cargandoClientes && <p>Cargando…</p>}

            {!cargandoClientes && clientes.length === 0 && (
              <p className="texto-ayuda">Todavía no hay negocios convertidos a cliente real.</p>
            )}

            {!cargandoClientes && clientes.length > 0 && (
              <ul className="lista-demos">
                {clientes.map((c) => (
                  <li key={c.empresaId} className="tarjeta-demo">
                    <div className="tarjeta-demo-header">
                      <strong>{c.nombre}</strong>
                      <div className="tarjeta-demo-badges">
                        <span className={c.activado ? 'badge-exito' : 'badge-pendiente'}>
                          {c.activado ? '✓ Activada' : 'Pendiente de activar'}
                        </span>
                        {c.diasSinPago != null && (
                          <span className="badge-sla badge-sla-amarillo">
                            🕒 {c.diasSinPago} día{c.diasSinPago === 1 ? '' : 's'} sin pago
                          </span>
                        )}
                      </div>
                    </div>
                    <p>{c.email || 'Sin email'} · {c.telefonoContacto}</p>
                    <p className="texto-ayuda">
                      {c.plan ? PLANES[c.plan.replace('PLAN_', '')]?.etiqueta || c.plan : 'Sin plan'}
                      {c.estadoSuscripcion && ` · ${ETIQUETA_ESTADO_SUSCRIPCION[c.estadoSuscripcion] || c.estadoSuscripcion}`}
                      {c.montoMensualActual ? ` · ${formatoCLP(c.montoMensualActual)}/mes` : ''}
                    </p>
                    <p className="texto-ayuda">
                      Convertido: {formatearFecha(c.creadoEn)}
                      {esAdmin && c.vendedorNombre && ` · Vendedor: ${c.vendedorNombre}`}
                    </p>

                    {esAdmin && (
                      <div className="tarjeta-demo-acciones">
                        <button className="cta-secundaria" onClick={() => setModalEditarPlan(c)}>
                          Cambiar plan
                        </button>
                        <button
                          className="btn-link btn-danger"
                          onClick={() => manejarEliminarCliente(c)}
                          disabled={eliminandoClienteId === c.empresaId}
                        >
                          {eliminandoClienteId === c.empresaId ? 'Eliminando…' : 'Eliminar'}
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {modalConvertir && (
        <ModalConvertirCliente
          demo={modalConvertir}
          token={token}
          onCerrar={() => setModalConvertir(null)}
          onConvertido={(resultado) => manejarConvertido(modalConvertir, resultado)}
        />
      )}

      {modalEditarPlan && (
        <ModalEditarPlan
          cliente={modalEditarPlan}
          token={token}
          onCerrar={() => setModalEditarPlan(null)}
          onGuardado={manejarPlanGuardado}
        />
      )}
    </div>
  );
}
