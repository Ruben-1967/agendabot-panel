import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchCampanas,
  crearCampana,
  prepararEnvioHoy,
  enviarCampana,
  fetchProductos,
  fetchEstimadoEnvio,
  fetchSegmentacionClientes,
  comprarCreditos,
} from '../../api/client';

const NOMBRES_DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const LIMITE_MENSAJE_DEL_DIA = 80;
const MINIMO_CREDITOS_COMPRA = 50;

function SelectorDias({ seleccionados, onChange }) {
  function alternar(dia) {
    if (seleccionados.includes(dia)) {
      onChange(seleccionados.filter((d) => d !== dia));
    } else {
      onChange([...seleccionados, dia].sort());
    }
  }

  return (
    <div className="selector-dias">
      {NOMBRES_DIAS.map((nombre, dia) => (
        <button
          type="button"
          key={dia}
          className={seleccionados.includes(dia) ? 'dia-chip activo' : 'dia-chip'}
          onClick={() => alternar(dia)}
        >
          {nombre}
        </button>
      ))}
    </div>
  );
}

// NUEVO: bloque plegable para elegir destinatarios puntuales de este envío
// específico, en vez de usar la segmentación persistente de la campaña.
function SelectorClientesPuntual({ token, productosActivos, seleccionClientes, onCambioSeleccion }) {
  const [abierto, setAbierto] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [filtros, setFiltros] = useState({
    montoMinimo: '', minPedidos: '', productoId: '', diasSinComprar: '',
  });

  async function buscar() {
    setCargando(true);
    try {
      const data = await fetchSegmentacionClientes(token, filtros);
      setClientes(data.clientes || []);
    } catch (err) {
      console.error('Error buscando clientes:', err);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (abierto && clientes.length === 0) buscar();
  }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  function alternarCliente(id) {
    onCambioSeleccion(
      seleccionClientes.includes(id)
        ? seleccionClientes.filter((x) => x !== id)
        : [...seleccionClientes, id]
    );
  }

  return (
    <div className="bloque-segmentacion-puntual">
      <button type="button" className="link-toggle" onClick={() => setAbierto(!abierto)}>
        {abierto ? 'Ocultar selección puntual de clientes' : '¿Elegir clientes específicos para este envío?'}
      </button>

      {abierto && (
        <div className="panel-segmentacion-puntual">
          <p className="texto-muted" style={{ margin: '4px 0' }}>
            Si eliges clientes acá, este envío va SOLO a ellos — ignora la segmentación
            persistente configurada en la campaña, solo por esta vez.
          </p>
          <div className="filtros-puntual">
            <input
              type="number" placeholder="Gastó al menos (CLP)"
              value={filtros.montoMinimo}
              onChange={(e) => setFiltros((f) => ({ ...f, montoMinimo: e.target.value }))}
            />
            <input
              type="number" placeholder="Mín. de pedidos"
              value={filtros.minPedidos}
              onChange={(e) => setFiltros((f) => ({ ...f, minPedidos: e.target.value }))}
            />
            <select
              value={filtros.productoId}
              onChange={(e) => setFiltros((f) => ({ ...f, productoId: e.target.value }))}
            >
              <option value="">Cualquier producto</option>
              {productosActivos.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
            <select
              value={filtros.diasSinComprar}
              onChange={(e) => setFiltros((f) => ({ ...f, diasSinComprar: e.target.value }))}
            >
              <option value="">Sin filtro de inactividad</option>
              <option value="14">Sin comprar hace 14+ días</option>
              <option value="21">Sin comprar hace 21+ días</option>
              <option value="30">Sin comprar hace 30+ días</option>
            </select>
            <button type="button" onClick={buscar} disabled={cargando}>
              {cargando ? 'Buscando…' : 'Aplicar filtros'}
            </button>
          </div>

          {clientes.length === 0 && !cargando && (
            <p className="texto-muted">Ningún cliente cumple estos filtros.</p>
          )}

          {clientes.length > 0 && (
            <div className="lista-clientes-puntual">
              {clientes.map((c) => (
                <label key={c.clienteId} className="checkbox-producto">
                  <input
                    type="checkbox"
                    checked={seleccionClientes.includes(c.clienteId)}
                    onChange={() => alternarCliente(c.clienteId)}
                  />
                  {c.nombre} — {c.numPedidos} pedidos, ${c.totalGastado.toLocaleString('es-CL')}
                  {c.productoTopNombre ? ` · le gusta ${c.productoTopNombre}` : ''}
                </label>
              ))}
            </div>
          )}

          <p className="texto-muted">
            Seleccionados: <b>{seleccionClientes.length}</b>
            {seleccionClientes.length > 0 && (
              <button type="button" className="link-toggle" onClick={() => onCambioSeleccion([])}>
                {' '}(limpiar selección)
              </button>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

// NUEVO: aviso de saldo + compra rápida cuando no alcanza
function AvisoCreditos({ token, estimado, onCompraRealizada }) {
  const [cantidad, setCantidad] = useState(MINIMO_CREDITOS_COMPRA);
  const [comprando, setComprando] = useState(false);

  if (!estimado) return null;

  const faltan = Math.max(0, estimado.clientesSuscritos - (estimado.saldoActual || 0));

  async function comprar() {
    if (cantidad < MINIMO_CREDITOS_COMPRA) return;
    setComprando(true);
    try {
      const data = await comprarCreditos(token, cantidad);
      alert(
        `Orden creada por $${data.montoClp.toLocaleString('es-CL')} CLP. ` +
        `La integración de pago con Flow.cl todavía está en desarrollo — por ahora esto no ` +
        `acredita el saldo automáticamente. Avísale a soporte para completar el pago manualmente.`
      );
      await onCompraRealizada();
    } catch (err) {
      alert(err.message);
    } finally {
      setComprando(false);
    }
  }

  return (
    <div className="aviso-creditos">
      <p className="aviso-costo">
        💳 Saldo de créditos: <b>{estimado.saldoActual ?? 0}</b> · Este envío necesita{' '}
        <b>{estimado.clientesSuscritos}</b> crédito(s).
      </p>
      {estimado.saldoInsuficiente && (
        <div className="compra-rapida-creditos">
          <p className="mensaje-error">
            Te faltan {faltan} créditos para poder enviar esto.
          </p>
          <input
            type="number" min={MINIMO_CREDITOS_COMPRA} step={10}
            value={cantidad}
            onChange={(e) => setCantidad(parseInt(e.target.value) || 0)}
            style={{ width: '90px', marginRight: '8px' }}
          />
          <button type="button" onClick={comprar} disabled={comprando}>
            {comprando ? 'Procesando…' : `Comprar ${cantidad} créditos`}
          </button>
        </div>
      )}
    </div>
  );
}

function TarjetaCampana({ campana, productosActivos, token, onCambio }) {
  const [seleccion, setSeleccion] = useState([]);
  const [seleccionClientes, setSeleccionClientes] = useState([]);
  const [mensajeDelDia, setMensajeDelDia] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [preparando, setPreparando] = useState(false);
  const [error, setError] = useState('');
  const [estimado, setEstimado] = useState(null);

  const envio = campana.envioDeHoy;

  async function recargarEstimado() {
    try {
      const data = await fetchEstimadoEnvio(
        token,
        campana.id,
        seleccionClientes.length > 0 ? seleccionClientes : undefined
      );
      setEstimado(data);
    } catch {
      setEstimado(null);
    }
  }

  useEffect(() => {
    if (envio && envio.estado === 'BORRADOR') {
      recargarEstimado();
    }
  }, [envio?.id, envio?.estado, seleccionClientes]); // eslint-disable-line react-hooks/exhaustive-deps

  async function preparar() {
    setPreparando(true);
    setError('');
    try {
      await prepararEnvioHoy(token, campana.id);
      await onCambio();
    } catch (err) {
      setError(err.message);
    } finally {
      setPreparando(false);
    }
  }

  async function enviar() {
    if (seleccion.length === 0) {
      setError('Elige al menos un producto para este envío.');
      return;
    }
    if (mensajeDelDia.length > LIMITE_MENSAJE_DEL_DIA) {
      setError(`El mensaje del día no puede superar los ${LIMITE_MENSAJE_DEL_DIA} caracteres.`);
      return;
    }
    const audiencia = seleccionClientes.length > 0
      ? `${seleccionClientes.length} cliente(s) elegidos puntualmente`
      : 'todos los clientes suscritos (o la segmentación configurada)';
    const costoTexto = estimado
      ? ` — costo estimado: $${estimado.costoEstimadoClp.toLocaleString('es-CL')} CLP (${estimado.clientesSuscritos} clientes)`
      : '';
    if (!confirm(`¿Enviar "${campana.nombre}" con ${seleccion.length} producto(s) a ${audiencia}?${costoTexto}`)) return;

    setEnviando(true);
    setError('');
    try {
      const resultado = await enviarCampana(
        token, campana.id, campana.envioDeHoy.id, seleccion,
        {
          clienteIds: seleccionClientes.length > 0 ? seleccionClientes : undefined,
          mensajeDelDia: mensajeDelDia || undefined,
        }
      );
      alert(
        `Enviado a ${resultado.enviados} clientes (${resultado.fallidos} fallidos). ` +
        `Costo real: $${resultado.costoClp?.toLocaleString('es-CL')} CLP. ` +
        `Saldo restante: ${resultado.saldoRestante} créditos.`
      );
      await onCambio();
    } catch (err) {
      if (err.message.includes('Saldo de créditos insuficiente')) {
        setError('Saldo de créditos insuficiente — compra más créditos abajo antes de reintentar.');
        recargarEstimado();
      } else {
        setError(err.message);
      }
    } finally {
      setEnviando(false);
    }
  }

  function alternarProducto(id) {
    setSeleccion((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="tarjeta-campana">
      <div className="tarjeta-campana-head">
        <div>
          <h3>{campana.nombre}</h3>
          <p className="texto-muted">
            {campana.diasSemana.map((d) => NOMBRES_DIAS[d]).join(' / ')} · {campana.hora} ·
            {' '}plantilla <code>{campana.plantillaWhatsapp}</code>
          </p>
          {campana.segmentada && (
            <p className="texto-muted etiqueta-segmentada">
              🎯 Segmentada: compró en los últimos {campana.segmentoDias} días
              {campana.segmentoMontoMinimoClp ? `, gastó ≥ $${campana.segmentoMontoMinimoClp.toLocaleString('es-CL')}` : ''}
              {campana.segmentoProductoIds?.length > 0 ? `, de ${campana.segmentoProductoIds.length} producto(s) específico(s)` : ''}
            </p>
          )}
        </div>
        <span className={`estado-pill estado-${envio?.estado?.toLowerCase() || 'ninguno'}`}>
          {envio ? (envio.estado === 'ENVIADO' ? 'Enviado hoy' : 'Borrador — falta enviar') : 'Sin preparar hoy'}
        </span>
      </div>

      {!envio && (
        <button onClick={preparar} disabled={preparando}>
          {preparando ? 'Preparando…' : 'Preparar envío de hoy'}
        </button>
      )}

      {envio && envio.estado === 'BORRADOR' && (
        <div className="armado-envio">
          {estimado && (
            <p className="aviso-costo">
              💸 Este envío llegaría a <b>{estimado.clientesSuscritos} clientes</b>
              {estimado.segmentada ? ' (ya filtrado por el segmento)' : ''} ≈{' '}
              <b>${estimado.costoEstimadoClp.toLocaleString('es-CL')} CLP</b> en tarifa de Meta
              (categoría Marketing, ${estimado.tarifaPorMensajeClp.toFixed(2)}/mensaje).
            </p>
          )}

          <AvisoCreditos token={token} estimado={estimado} onCompraRealizada={recargarEstimado} />

          <div className="campo-mensaje-dia">
            <label className="texto-muted">Mensaje del día (opcional)</label>
            <textarea
              maxLength={LIMITE_MENSAJE_DEL_DIA}
              placeholder="ej. ¡Hoy tenemos algo especial para el Día del Café!"
              value={mensajeDelDia}
              onChange={(e) => setMensajeDelDia(e.target.value)}
            />
            <p className="texto-muted" style={{ textAlign: 'right', fontSize: '0.8em' }}>
              {mensajeDelDia.length} / {LIMITE_MENSAJE_DEL_DIA}
            </p>
          </div>

          <SelectorClientesPuntual
            token={token}
            productosActivos={productosActivos}
            seleccionClientes={seleccionClientes}
            onCambioSeleccion={setSeleccionClientes}
          />

          <p className="texto-muted">Elige qué productos van en el envío de hoy:</p>
          <div className="grilla-checkbox">
            {productosActivos.map((p) => (
              <label key={p.id} className="checkbox-producto">
                <input
                  type="checkbox"
                  checked={seleccion.includes(p.id)}
                  onChange={() => alternarProducto(p.id)}
                />
                {p.nombre} — ${p.precio}
              </label>
            ))}
          </div>
          {productosActivos.length === 0 && (
            <p className="mensaje-error">No tienes productos activos en tu catálogo todavía.</p>
          )}
          <button
            onClick={enviar}
            disabled={enviando || productosActivos.length === 0 || (estimado && estimado.saldoInsuficiente)}
          >
            {enviando ? 'Enviando…' : 'Enviar'}
          </button>
        </div>
      )}

      {envio && envio.estado === 'ENVIADO' && (
        <p className="texto-muted">
          Enviado a {envio.destinatariosCount} cliente(s), con {envio.productosOfrecidosJson?.length || 0} producto(s)
          {envio.costoEstimadoClp != null && <> — costo real: <b>${envio.costoEstimadoClp.toLocaleString('es-CL')} CLP</b></>}.
        </p>
      )}

      {error && <p className="mensaje-error">{error}</p>}
    </div>
  );
}

export default function Campanas() {
  const { token } = useAuth();
  const [campanas, setCampanas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [nombre, setNombre] = useState('');
  const [dias, setDias] = useState([1, 3, 5]);
  const [hora, setHora] = useState('08:00');
  const [plantilla, setPlantilla] = useState('');
  const [creando, setCreando] = useState(false);

  const [segmentada, setSegmentada] = useState(false);
  const [segmentoDias, setSegmentoDias] = useState(30);
  const [segmentoMonto, setSegmentoMonto] = useState('');
  const [segmentoProductos, setSegmentoProductos] = useState([]);

  async function cargar() {
    try {
      const [dataCampanas, dataProductos] = await Promise.all([
        fetchCampanas(token),
        fetchProductos(token),
      ]);
      setCampanas(dataCampanas.campanas);
      setProductos(dataProductos.productos);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function manejarCrear(e) {
    e.preventDefault();
    if (!nombre || dias.length === 0 || !hora || !plantilla) return;
    setCreando(true);
    setError('');
    try {
      await crearCampana(token, {
        nombre, diasSemana: dias, hora, plantillaWhatsapp: plantilla,
        segmentada,
        segmentoDias: segmentada ? Number(segmentoDias) : undefined,
        segmentoMontoMinimoClp: segmentada && segmentoMonto ? Number(segmentoMonto) : undefined,
        segmentoProductoIds: segmentada ? segmentoProductos : undefined,
      });
      setNombre(''); setPlantilla('');
      setSegmentada(false); setSegmentoDias(30); setSegmentoMonto(''); setSegmentoProductos([]);
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreando(false);
    }
  }

  function alternarProductoSegmento(id) {
    setSegmentoProductos((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const productosActivos = productos.filter((p) => p.activo);

  return (
    <div>
      <h1>Campañas de envío</h1>
      <p className="pagina-sub">
        Configura cuándo se prepara cada envío. A la hora indicada, se crea un borrador — tú eliges
        los productos de ese día y lo envías desde aquí.
      </p>

      <form className="form-campana" onSubmit={manejarCrear}>
        <input placeholder="Nombre (ej. Panes de la mañana)" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        <SelectorDias seleccionados={dias} onChange={setDias} />
        <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} required />
        <input placeholder="Nombre exacto de la plantilla en Meta" value={plantilla} onChange={(e) => setPlantilla(e.target.value)} required />

        <label className="checkbox-segmentacion">
          <input type="checkbox" checked={segmentada} onChange={(e) => setSegmentada(e.target.checked)} />
          Enviar solo a un segmento específico de clientes (no a todos los suscritos)
        </label>

        {segmentada && (
          <div className="bloque-segmentacion">
            <label className="campo-segmento">
              Que hayan comprado en los últimos
              <input
                type="number" min="1" value={segmentoDias}
                onChange={(e) => setSegmentoDias(e.target.value)}
                style={{ width: '60px', margin: '0 6px' }}
              />
              días
            </label>
            <label className="campo-segmento">
              Que hayan gastado al menos $
              <input
                type="number" min="0" placeholder="(opcional)" value={segmentoMonto}
                onChange={(e) => setSegmentoMonto(e.target.value)}
                style={{ width: '100px', margin: '0 6px' }}
              />
              CLP en ese período
            </label>
            <p className="texto-muted" style={{ margin: '4px 0' }}>
              Que hayan comprado alguno de estos productos (déjalo vacío para no filtrar por producto):
            </p>
            <div className="grilla-checkbox">
              {productosActivos.map((p) => (
                <label key={p.id} className="checkbox-producto">
                  <input
                    type="checkbox"
                    checked={segmentoProductos.includes(p.id)}
                    onChange={() => alternarProductoSegmento(p.id)}
                  />
                  {p.nombre}
                </label>
              ))}
            </div>
          </div>
        )}

        <button type="submit" disabled={creando}>{creando ? 'Creando…' : 'Crear campaña'}</button>
      </form>

      {error && <p className="mensaje-error">{error}</p>}

      {cargando ? (
        <p className="texto-muted">Cargando…</p>
      ) : campanas.length === 0 ? (
        <p className="texto-muted">Todavía no tienes campañas configuradas.</p>
      ) : (
        <div className="lista-campanas">
          {campanas.map((c) => (
            <TarjetaCampana key={c.id} campana={c} productosActivos={productosActivos} token={token} onCambio={cargar} />
          ))}
        </div>
      )}
    </div>
  );
}
