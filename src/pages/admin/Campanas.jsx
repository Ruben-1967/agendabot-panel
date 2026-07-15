import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchCampanas,
  crearCampana,
  prepararEnvioHoy,
  enviarCampana,
  fetchProductos,
  fetchEstimadoEnvio,
} from '../../api/client';

const NOMBRES_DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

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

function TarjetaCampana({ campana, productosActivos, token, onCambio }) {
  const [seleccion, setSeleccion] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [preparando, setPreparando] = useState(false);
  const [error, setError] = useState('');
  const [estimado, setEstimado] = useState(null);

  const envio = campana.envioDeHoy;

  useEffect(() => {
    if (envio && envio.estado === 'BORRADOR') {
      fetchEstimadoEnvio(token, campana.id).then(setEstimado).catch(() => setEstimado(null));
    }
  }, [envio?.id, envio?.estado]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const costoTexto = estimado
      ? ` — costo estimado: $${estimado.costoEstimadoClp.toLocaleString('es-CL')} CLP (${estimado.clientesSuscritos} clientes × $${estimado.tarifaPorMensajeClp.toFixed(2)})`
      : '';
    if (!confirm(`¿Enviar "${campana.nombre}" con ${seleccion.length} producto(s) a todos los clientes suscritos?${costoTexto}`)) return;

    setEnviando(true);
    setError('');
    try {
      const resultado = await enviarCampana(token, campana.id, campana.envioDeHoy.id, seleccion);
      alert(`Enviado a ${resultado.enviados} clientes (${resultado.fallidos} fallidos). Costo real: $${resultado.costoClp?.toLocaleString('es-CL')} CLP.`);
      await onCambio();
    } catch (err) {
      setError(err.message);
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
              {estimado.segmentada ? ' (ya filtrado por el segmento configurado)' : ''} ≈{' '}
              <b>${estimado.costoEstimadoClp.toLocaleString('es-CL')} CLP</b> en tarifa de Meta
              (categoría Marketing, ${estimado.tarifaPorMensajeClp.toFixed(2)}/mensaje).
            </p>
          )}
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
          <button onClick={enviar} disabled={enviando || productosActivos.length === 0}>
            {enviando ? 'Enviando…' : `Enviar a clientes suscritos`}
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
