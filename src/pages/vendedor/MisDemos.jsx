import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVendedorAuth } from '../../context/VendedorAuthContext';
import { fetchProspectosDemo, eliminarProspectoDemo, convertirClienteReal, fetchVendedoresKPI, fetchKpisDiarios } from '../../api/client';
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

export default function MisDemos() {
  const { token, vendedor } = useVendedorAuth();
  const navigate = useNavigate();
  const esAdmin = vendedor?.rol === 'ADMIN';

  const [demos, setDemos] = useState([]);
  const [contadorVencidos, setContadorVencidos] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [eliminandoId, setEliminandoId] = useState(null);
  const [procesandoId, setProcesandoId] = useState(null);

  const [filtroEstadoSLA, setFiltroEstadoSLA] = useState('');
  const [filtroTipoLead, setFiltroTipoLead] = useState('');
  const [filtroVendedorId, setFiltroVendedorId] = useState('todos');

  const [vendedoresKPI, setVendedoresKPI] = useState([]);
  const [avisoLinkManual, setAvisoLinkManual] = useState(null);

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

  async function manejarConvertir(demo) {
    const confirmado = window.confirm(
      `¿Convertir a "${demo.nombreNegocio}" en cliente real? Se le enviará por WhatsApp un link para que defina su propia contraseña y elija un plan.`
    );
    if (!confirmado) return;

    setProcesandoId(demo.id);
    setError('');
    setAvisoLinkManual(null);
    try {
      const resultado = await convertirClienteReal(token, demo.id);
      // Se muestra siempre, no solo cuando whatsappEnviado es false: que la
      // API de Meta no haya tirado error no garantiza que el mensaje haya
      // llegado de verdad al teléfono del prospecto (ej. número sin una app
      // de WhatsApp real detrás), así que el link queda visible como
      // respaldo en los dos casos.
      setAvisoLinkManual({
        nombreNegocio: demo.nombreNegocio,
        link: resultado.linkActivacion,
        whatsappEnviado: resultado.whatsappEnviado,
      });
      cargar();
    } catch (err) {
      setError(err.message || 'No se pudo convertir a cliente real');
    } finally {
      setProcesandoId(null);
    }
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
                  onClick={() => manejarConvertir(d)}
                  disabled={procesandoId === d.id}
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
      </div>
    </div>
  );
}
