import { useEffect, useMemo, useState } from 'react';
import { useVendedorAuth } from '../../../context/VendedorAuthContext';
import {
  fetchClientesWeb, fetchClienteWeb, crearClienteWeb, actualizarClienteWeb, eliminarClienteWeb,
  crearMovimientoClienteWeb, eliminarMovimientoClienteWeb, crearLinkSuscripcionClienteWeb,
} from '../../../api/client';
import NavVendedor from '../NavVendedor';
import '../vendedor.css';

// Panel de clientes de Multidigital "sitio web + correos": embudo por etapas,
// ficha de cada negocio, cuenta corriente (cargos/pagos/saldo) y link de
// suscripción con Flow. Backend: src/routes/clientesWeb.js.

const ETAPAS = [
  { clave: 'INTERESADO', etiqueta: 'Interesado' },
  { clave: 'EJEMPLO_ENVIADO', etiqueta: 'Ejemplo enviado' },
  { clave: 'EN_ESPERA', etiqueta: 'En espera' },
  { clave: 'ABONO', etiqueta: 'Abono recibido' },
  { clave: 'ACTIVO', etiqueta: 'Activo' },
  { clave: 'BAJA', etiqueta: 'Baja' },
];
const ETIQUETA_ETAPA = Object.fromEntries(ETAPAS.map((e) => [e.clave, e.etiqueta]));
const CONCEPTOS = [
  ['MENSUALIDAD', 'Mensualidad'], ['ANUALIDAD', 'Plan anual'], ['HOSTING', 'Hosting'], ['DOMINIO', 'Dominio'],
  ['CAMBIO', 'Cambio puntual'], ['CORREO_EXTRA', 'Correo extra'], ['OTRO', 'Otro'],
];
const ETIQUETA_CONCEPTO = Object.fromEntries(CONCEPTOS);
const MEDIOS = [['TRANSFERENCIA', 'Transferencia'], ['FLOW', 'Flow'], ['EFECTIVO', 'Efectivo'], ['OTRO', 'Otro']];
const ETIQUETA_MEDIO = Object.fromEntries(MEDIOS);
const DIAS_ALERTA_SIN_RESPUESTA = 5;

function formatFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Santiago' });
}
function formatoCLP(n) {
  return `$${Math.round(n || 0).toLocaleString('es-CL')}`;
}
function hoyChile() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
}
function diasDesde(iso) {
  return iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null;
}
function linkWhatsApp(telefono, texto) {
  return `https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`;
}

function textoEstadoFlow(s) {
  if (!s) return null;
  if (s.ultimoPagoFallido) return { texto: 'Flow: pago rechazado', clase: 'badge-cw-rojo' };
  if (s.estado === 'ACTIVA') return { texto: 'Flow activo', clase: 'badge-cw-verde' };
  if (s.estado === 'CANCELADA') return { texto: 'Flow cancelado', clase: 'badge-cw-gris' };
  if (s.estado === 'ACTIVANDO') return { texto: 'Flow: revisar', clase: 'badge-cw-rojo' };
  return { texto: s.estado === 'ACEPTADA' ? 'Aceptó, sin tarjeta' : 'Link enviado', clase: 'badge-cw-ambar' };
}

// ---------- Ficha: datos editables ----------
function FormDatos({ cliente, onGuardar, guardando }) {
  const [d, setD] = useState(() => ({
    negocio: cliente.negocio || '', rubro: cliente.rubro || '', contactoNombre: cliente.contactoNombre || '',
    telefono: cliente.telefono || '', email: cliente.email || '', comuna: cliente.comuna || '',
    dominio: cliente.dominio || '', linkMuestra: cliente.linkMuestra || '', plan: cliente.plan || '',
    condiciones: cliente.condiciones || '', notas: cliente.notas || '',
  }));
  const campo = (k) => ({ value: d[k], onChange: (e) => setD({ ...d, [k]: e.target.value }) });
  return (
    <form className="form-vendedor cw-form" onSubmit={(e) => { e.preventDefault(); onGuardar(d); }}>
      <div className="cw-grilla">
        <label>Negocio<input {...campo('negocio')} required /></label>
        <label>Rubro<input {...campo('rubro')} placeholder="Peluquería, óptica…" /></label>
        <label>Contacto<input {...campo('contactoNombre')} /></label>
        <label>Teléfono (WhatsApp)<input {...campo('telefono')} placeholder="+56 9 1234 5678" /></label>
        <label>Correo<input type="email" {...campo('email')} /></label>
        <label>Comuna / ciudad<input {...campo('comuna')} /></label>
        <label>Dominio<input {...campo('dominio')} placeholder="tunegocio.cl" /></label>
        <label>Link de la muestra<input {...campo('linkMuestra')} placeholder="https://muestras.multidigital.cl/…" /></label>
        <label>Plan
          <select {...campo('plan')}>
            <option value="">— Sin definir —</option>
            <option value="MENSUAL">Mensual ($9.900 + IVA)</option>
            <option value="ANUAL">Anual ($95.000 + IVA)</option>
          </select>
        </label>
      </div>
      <label>Condiciones acordadas
        <textarea className="cw-textarea" rows={2} {...campo('condiciones')} placeholder="Ej.: hosting con 50% el 1er año (promo octubre); paga 50% al inicio y 50% al publicar" />
      </label>
      <label>Notas
        <textarea className="cw-textarea" rows={2} {...campo('notas')} />
      </label>
      <button className="cta-primaria" type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar datos'}</button>
    </form>
  );
}

// ---------- Ficha: cuenta corriente ----------
function Cuenta({ cliente, token, onCambio, setError }) {
  const [form, setForm] = useState({ tipo: 'PAGO', concepto: 'MENSUALIDAD', monto: '', medio: 'TRANSFERENCIA', fecha: hoyChile(), nota: '' });
  const [enviando, setEnviando] = useState(false);
  const { cuenta, movimientos } = cliente;

  async function agregar(e) {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      // "11.781" o "11781" -> 11781; si escriben decimales ("11781,5") se ignoran.
      const monto = Number(String(form.monto).split(',')[0].replace(/\D/g, ''));
      await crearMovimientoClienteWeb(token, cliente.id, { ...form, monto });
      setForm({ ...form, monto: '', nota: '' });
      await onCambio();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }
  async function borrar(m) {
    if (!window.confirm(`¿Eliminar este ${m.tipo === 'CARGO' ? 'cargo' : 'pago'} de ${formatoCLP(m.monto)}?`)) return;
    setError('');
    try {
      await eliminarMovimientoClienteWeb(token, cliente.id, m.id);
      await onCambio();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="kpi-vendedor">
        <div><strong>{formatoCLP(cuenta.cargos)}</strong><span>Cobrado (cargos)</span></div>
        <div><strong>{formatoCLP(cuenta.pagos)}</strong><span>Pagado</span></div>
        <div><strong className={cuenta.saldo > 0 ? 'cw-saldo-deuda' : ''}>{formatoCLP(cuenta.saldo)}</strong><span>{cuenta.saldo > 0 ? 'Saldo pendiente' : cuenta.saldo < 0 ? 'A favor del cliente' : 'Al día'}</span></div>
      </div>

      {movimientos.length > 0 && (
        <div className="cw-tabla-scroll">
          <table className="tabla-admin-vendedor">
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Concepto</th><th>Monto</th><th>Medio / nota</th><th /></tr></thead>
            <tbody>
              {movimientos.map((m) => (
                <tr key={m.id}>
                  <td>{formatFecha(m.fecha)}</td>
                  <td><span className={m.tipo === 'CARGO' ? 'badge-cw-ambar' : 'badge-cw-verde'}>{m.tipo === 'CARGO' ? 'Cargo' : 'Pago'}</span></td>
                  <td>{ETIQUETA_CONCEPTO[m.concepto] || m.concepto}</td>
                  <td>{formatoCLP(m.monto)}</td>
                  <td className="texto-muted">{[m.medio && ETIQUETA_MEDIO[m.medio], m.nota].filter(Boolean).join(' · ') || '—'}</td>
                  <td>{!m.pagoWebId && <button type="button" className="btn-link" onClick={() => borrar(m)}>Eliminar</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form className="form-vendedor cw-form" onSubmit={agregar}>
        <p className="campo-seccion-titulo">Registrar movimiento</p>
        {cliente.suscripcion?.estado === 'ACTIVA' && (
          <p className="texto-ayuda" style={{ marginBottom: 12 }}>
            Los períodos que cobra Flow se anotan solos (cargo y pago): no los registres a mano.
          </p>
        )}
        <div className="pestanas-filtro" style={{ marginBottom: 12 }}>
          {[['CARGO', 'Cargo (lo que debe)'], ['PAGO', 'Pago / abono (lo que pagó)']].map(([v, t]) => (
            <button key={v} type="button" className={`pestana-filtro ${form.tipo === v ? 'activa' : ''}`} onClick={() => setForm({ ...form, tipo: v })}>{t}</button>
          ))}
        </div>
        <div className="cw-grilla">
          <label>Concepto
            <select value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })}>
              {CONCEPTOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </label>
          <label>Monto con IVA ($)
            <input inputMode="numeric" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} placeholder="11781" required />
          </label>
          {form.tipo === 'PAGO' && (
            <label>Medio
              <select value={form.medio} onChange={(e) => setForm({ ...form, medio: e.target.value })}>
                {MEDIOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
            </label>
          )}
          <label>Fecha<input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required /></label>
        </div>
        <label>Nota<input value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} placeholder="Ej.: abono 50% por transferencia" /></label>
        <button className="cta-primaria" type="submit" disabled={enviando}>{enviando ? 'Guardando…' : `Agregar ${form.tipo === 'CARGO' ? 'cargo' : 'pago'}`}</button>
      </form>
    </>
  );
}

// ---------- Ficha: suscripción con Flow ----------
function SuscripcionFlow({ cliente, token, onCambio, setError }) {
  const s = cliente.suscripcion;
  const [plan, setPlan] = useState(cliente.plan || 'MENSUAL');
  const [email, setEmail] = useState(cliente.email || '');
  const [pagadoEl, setPagadoEl] = useState('');
  // Si se editan plan o correo en "Datos", el formulario del link los toma.
  useEffect(() => { if (cliente.plan) setPlan(cliente.plan); }, [cliente.plan]);
  useEffect(() => { setEmail(cliente.email || ''); }, [cliente.email]);
  const [creando, setCreando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  async function generar(e) {
    e.preventDefault();
    setCreando(true);
    setError('');
    try {
      await crearLinkSuscripcionClienteWeb(token, cliente.id, { plan, email, pagadoEl: pagadoEl || undefined });
      await onCambio();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreando(false);
    }
  }
  async function copiar(link) {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt('Copia el link:', link);
    }
  }

  if (s && s.estado !== 'CANCELADA') {
    const estado = textoEstadoFlow(s);
    return (
      <div className="tarjeta-demo">
        <p><span className={estado.clase}>{estado.texto}</span> · Plan {s.plan === 'ANUAL' ? 'anual' : 'mensual'} {formatoCLP(s.montoConIva)}</p>
        <p>Primer cargo automático: {s.fechaPrimerCobro ? formatFecha(s.fechaPrimerCobro) : 'al registrar la tarjeta'}</p>
        {s.fechaAceptacion && <p>Aceptó el contrato: {formatFecha(s.fechaAceptacion)}{s.tarjetaUltimos4 ? ` · tarjeta •••• ${s.tarjetaUltimos4}` : ''}</p>}
        {s.fechaUltimoPago && <p>Último pago Flow: {formatFecha(s.fechaUltimoPago)}</p>}
        <p className="cw-link">{s.link}</p>
        <div className="cw-acciones">
          <button type="button" className="cta-secundaria" onClick={() => copiar(s.link)}>{copiado ? '¡Copiado!' : 'Copiar link'}</button>
          {cliente.telefono && (
            <a className="cta-secundaria" href={linkWhatsApp(cliente.telefono, `Hola${cliente.contactoNombre ? ` ${cliente.contactoNombre}` : ''}, este es el link para activar tu suscripción de Multidigital: ${s.link}`)} target="_blank" rel="noreferrer">
              Enviar por WhatsApp
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <form className="form-vendedor cw-form" onSubmit={generar}>
      <p className="texto-ayuda" style={{ marginBottom: 12 }}>
        Genera el link para que el cliente acepte el contrato y registre su tarjeta en Flow. Los cobros de Flow aparecerán solos en la cuenta.
      </p>
      <div className="cw-grilla">
        <label>Plan
          <select value={plan} onChange={(e) => setPlan(e.target.value)}>
            <option value="MENSUAL">Mensual ($11.781 c/IVA)</option>
            <option value="ANUAL">Anual ($113.050 c/IVA)</option>
          </select>
        </label>
        <label>Correo del cliente<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Ya pagó el 1er período el (opcional)
          <input type="date" value={pagadoEl} onChange={(e) => setPagadoEl(e.target.value)} />
        </label>
      </div>
      <p className="texto-ayuda" style={{ marginBottom: 12 }}>
        Con fecha de pago, Flow cobra por primera vez 1 {plan === 'ANUAL' ? 'año' : 'mes'} después. Sin fecha, cobra al registrar la tarjeta.
      </p>
      <button className="cta-primaria" type="submit" disabled={creando}>{creando ? 'Generando…' : 'Generar link de suscripción'}</button>
    </form>
  );
}

// ---------- Ficha completa (expandida) ----------
function Ficha({ id, token, onCambioLista, setError }) {
  const [cliente, setCliente] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState('');

  async function cargar() {
    const c = await fetchClienteWeb(token, id);
    setCliente(c);
    return c;
  }
  useEffect(() => { cargar().catch((err) => setError(err.message)); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function refrescar() {
    await cargar();
    onCambioLista();
  }
  async function cambiarEtapa(etapa) {
    setError('');
    try {
      await actualizarClienteWeb(token, id, { etapa });
      await refrescar();
    } catch (err) {
      setError(err.message);
    }
  }
  async function guardarDatos(datos) {
    setGuardando(true);
    setError('');
    try {
      await actualizarClienteWeb(token, id, datos);
      await refrescar();
      setAviso('Datos guardados');
      setTimeout(() => setAviso(''), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }
  async function eliminar() {
    if (!window.confirm(`¿Eliminar la ficha de ${cliente.negocio} con todos sus movimientos? No se puede deshacer.`)) return;
    setError('');
    try {
      await eliminarClienteWeb(token, id);
      onCambioLista(true);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!cliente) return <div className="detalle-vendedor-admin"><p>Cargando…</p></div>;
  return (
    <div className="detalle-vendedor-admin" onClick={(e) => e.stopPropagation()}>
      <h3 className="subtitulo-tarjeta">Etapa</h3>
      <div className="pestanas-filtro" style={{ marginBottom: 8 }}>
        {ETAPAS.map((e) => (
          <button key={e.clave} type="button" className={`pestana-filtro ${cliente.etapa === e.clave ? 'activa' : ''}`} onClick={() => cambiarEtapa(e.clave)}>{e.etiqueta}</button>
        ))}
      </div>
      <p className="texto-ayuda" style={{ marginBottom: 16 }}>
        Creado {formatFecha(cliente.creadoEn)}{cliente.origen === 'BOT' ? ' por el bot de WhatsApp' : ''}
        {cliente.fechaEjemplo ? ` · ejemplo enviado ${formatFecha(cliente.fechaEjemplo)}` : ''}
        {cliente.fechaActivacion ? ` · activo desde ${formatFecha(cliente.fechaActivacion)}` : ''}
        {cliente.preferencia ? ` · prefirió ${cliente.preferencia === 'LLAMADA' ? `llamada${cliente.horarioLlamada ? ` (${cliente.horarioLlamada})` : ''}` : 'el ejemplo'}` : ''}
      </p>

      <h3 className="subtitulo-tarjeta">Cuenta</h3>
      <Cuenta cliente={cliente} token={token} onCambio={refrescar} setError={setError} />

      <h3 className="subtitulo-tarjeta" style={{ marginTop: 20 }}>Cobro automático con Flow</h3>
      <SuscripcionFlow cliente={cliente} token={token} onCambio={refrescar} setError={setError} />

      <h3 className="subtitulo-tarjeta" style={{ marginTop: 20 }}>Datos</h3>
      {aviso && <p className="aviso-guardado">{aviso}</p>}
      {/* Sin key por actualizadoEn: si se remontara en cada recarga de la ficha, se
          perdería lo escrito y no guardado al cambiar etapa o agregar un pago. */}
      <FormDatos cliente={cliente} onGuardar={guardarDatos} guardando={guardando} />

      <button type="button" className="cta-secundaria cw-eliminar" onClick={eliminar}>Eliminar ficha</button>
    </div>
  );
}

// ---------- Alta rápida ----------
function ModalNuevo({ token, onCreado, onCerrar }) {
  const [d, setD] = useState({ negocio: '', contactoNombre: '', telefono: '', email: '', comuna: '', etapa: 'INTERESADO' });
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const campo = (k) => ({ value: d[k], onChange: (e) => setD({ ...d, [k]: e.target.value }) });
  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      const c = await crearClienteWeb(token, d);
      onCreado(c.id);
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  }
  return (
    <div className="modal-vendedor-overlay" onClick={onCerrar}>
      <div className="modal-vendedor-caja" onClick={(e) => e.stopPropagation()}>
        <h3>Nuevo cliente web</h3>
        <form className="form-vendedor" onSubmit={guardar}>
          {error && <p className="login-error">{error}</p>}
          <label>Negocio<input {...campo('negocio')} required autoFocus /></label>
          <label>Contacto<input {...campo('contactoNombre')} /></label>
          <label>Teléfono (WhatsApp)<input {...campo('telefono')} placeholder="+56 9 1234 5678" /></label>
          <label>Correo<input type="email" {...campo('email')} /></label>
          <label>Comuna / ciudad<input {...campo('comuna')} /></label>
          <label>Etapa
            <select {...campo('etapa')}>{ETAPAS.map((e) => <option key={e.clave} value={e.clave}>{e.etiqueta}</option>)}</select>
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="cta-primaria" type="submit" disabled={guardando}>{guardando ? 'Creando…' : 'Crear ficha'}</button>
            <button type="button" className="cta-secundaria" onClick={onCerrar}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ClientesWeb() {
  const { token } = useVendedorAuth();
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(null);
  const [nuevo, setNuevo] = useState(false);

  function cargar() {
    return fetchClientesWeb(token)
      .then((data) => { setClientes(data.clientes || []); setError(''); })
      .catch((err) => setError(err.message || 'No se pudo cargar la lista'))
      .finally(() => setCargando(false));
  }
  useEffect(() => { cargar(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const conteo = useMemo(() => {
    const c = Object.fromEntries(ETAPAS.map((e) => [e.clave, 0]));
    clientes.forEach((x) => { c[x.etapa] = (c[x.etapa] || 0) + 1; });
    return c;
  }, [clientes]);
  const saldoTotal = clientes.reduce((s, c) => s + Math.max(0, c.cuenta.saldo), 0);
  const sinRespuesta = clientes.filter((c) => ['EJEMPLO_ENVIADO', 'EN_ESPERA'].includes(c.etapa) && diasDesde(c.fechaEjemplo || c.actualizadoEn) >= DIAS_ALERTA_SIN_RESPUESTA).length;
  const flowRechazado = clientes.filter((c) => c.suscripcion?.ultimoPagoFallido).length;

  const visibles = clientes.filter((c) => {
    if (filtro === 'CON_SALDO') { if (c.cuenta.saldo <= 0) return false; }
    else if (filtro !== 'TODOS' && c.etapa !== filtro) return false;
    if (!busqueda.trim()) return true;
    const q = busqueda.trim().toLowerCase();
    return [c.negocio, c.contactoNombre, c.comuna, c.telefono, c.email, c.dominio].some((v) => v && v.toLowerCase().includes(q));
  });

  return (
    <div className="pantalla-vendedor">
      <NavVendedor />
      <div className="vendedor-inner cw-ancho">
        <p className="vendedor-eyebrow">Multidigital · sitio web + correos</p>
        <h1>Clientes Web</h1>
        <p className="texto-ayuda">
          Embudo de interesados y clientes, sus pagos y abonos, y el cobro automático con Flow. Los pagos de Flow se registran solos; las transferencias y abonos los anotas en cada ficha.
        </p>

        <div className="kpi-vendedor">
          <div><strong>{conteo.INTERESADO + conteo.EJEMPLO_ENVIADO + conteo.EN_ESPERA}</strong><span>En proceso</span></div>
          <div><strong>{conteo.ABONO + conteo.ACTIVO}</strong><span>Clientes</span></div>
          <div><strong className={saldoTotal > 0 ? 'cw-saldo-deuda' : ''}>{formatoCLP(saldoTotal)}</strong><span>Por cobrar</span></div>
          <div><strong className={sinRespuesta ? 'cw-saldo-deuda' : ''}>{sinRespuesta}</strong><span>Sin respuesta +{DIAS_ALERTA_SIN_RESPUESTA}d</span></div>
          {flowRechazado > 0 && <div><strong className="cw-saldo-deuda">{flowRechazado}</strong><span>Pago Flow rechazado</span></div>}
        </div>

        {error && <p className="login-error">{error}</p>}

        <div className="cw-barra">
          <input className="cw-buscar" placeholder="Buscar negocio, contacto, comuna…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <button type="button" className="cta-primaria cw-nuevo" onClick={() => setNuevo(true)}>+ Nuevo cliente</button>
        </div>
        <div className="pestanas-filtro" style={{ margin: '12px 0 16px' }}>
          <button type="button" className={`pestana-filtro ${filtro === 'TODOS' ? 'activa' : ''}`} onClick={() => setFiltro('TODOS')}>Todos ({clientes.length})</button>
          {ETAPAS.map((e) => (
            <button key={e.clave} type="button" className={`pestana-filtro ${filtro === e.clave ? 'activa' : ''}`} onClick={() => setFiltro(e.clave)}>{e.etiqueta} ({conteo[e.clave]})</button>
          ))}
          <button type="button" className={`pestana-filtro ${filtro === 'CON_SALDO' ? 'activa' : ''}`} onClick={() => setFiltro('CON_SALDO')}>Con saldo pendiente</button>
        </div>

        {cargando && <p>Cargando…</p>}
        {!cargando && visibles.length === 0 && <p className="texto-ayuda">No hay clientes en esta vista.</p>}

        <div className="lista-vendedores-admin">
          {visibles.map((c) => {
            const flow = textoEstadoFlow(c.suscripcion);
            const dias = ['EJEMPLO_ENVIADO', 'EN_ESPERA'].includes(c.etapa) ? diasDesde(c.fechaEjemplo || c.actualizadoEn) : null;
            return (
              <div key={c.id} className="tarjeta-vendedor-admin-wrap">
                <div
                  className="tarjeta-vendedor-admin"
                  role="button"
                  tabIndex={0}
                  onClick={() => setAbierto(abierto === c.id ? null : c.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAbierto(abierto === c.id ? null : c.id); } }}
                >
                  <div className="tarjeta-vendedor-admin-info">
                    <strong>{c.negocio}</strong>
                    <span className="texto-muted">{[c.contactoNombre, c.comuna, c.rubro].filter(Boolean).join(' · ') || 'Sin datos de contacto'}</span>
                    <span className="cw-badges">
                      <span className={`badge-cw-etapa etapa-${c.etapa.toLowerCase()}`}>{ETIQUETA_ETAPA[c.etapa]}</span>
                      {c.origen === 'BOT' && <span className="badge-cw-gris">Bot</span>}
                      {flow && <span className={flow.clase}>{flow.texto}</span>}
                      {dias !== null && dias >= DIAS_ALERTA_SIN_RESPUESTA && <span className="badge-cw-rojo">{dias} días sin respuesta</span>}
                    </span>
                  </div>
                  <div className="tarjeta-vendedor-admin-derecha">
                    {c.cuenta.saldo > 0 && <span className="cw-saldo-deuda">Debe {formatoCLP(c.cuenta.saldo)}</span>}
                    <span className="btn-link">{abierto === c.id ? 'Cerrar' : 'Abrir'}</span>
                  </div>
                </div>
                {abierto === c.id && (
                  <Ficha id={c.id} token={token} setError={setError} onCambioLista={(borrado) => { if (borrado) setAbierto(null); cargar(); }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
      {nuevo && (
        <ModalNuevo token={token} onCerrar={() => setNuevo(false)} onCreado={(id) => { setNuevo(false); setFiltro('TODOS'); setAbierto(id); cargar(); }} />
      )}
    </div>
  );
}
