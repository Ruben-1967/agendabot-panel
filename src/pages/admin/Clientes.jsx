import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchConfigClientes,
  fetchClientes,
  fetchCliente,
  crearCliente,
  actualizarCliente,
  registrarVenta,
} from '../../api/client';

function formatearFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatearEtiqueta(clave) {
  const conEspacios = clave.replace(/([A-Z])/g, ' $1');
  return conEspacios.charAt(0).toUpperCase() + conEspacios.slice(1);
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

function CamposFichaRecursivo({ schema, path, valores, onCambio }) {
  if (!schema || typeof schema !== 'object') return null;

  return (
    <>
      {Object.entries(schema).map(([clave, definicion]) => {
        const rutaActual = [...path, clave];
        const rutaId = rutaActual.join('.');

        if (definicion && typeof definicion === 'object' && !Array.isArray(definicion)) {
          return (
            <fieldset key={rutaId} className="ficha-subgrupo" style={{ border: '1px solid #DAD4C0', borderRadius: 8, padding: 10, marginTop: 8 }}>
              <legend style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                {formatearEtiqueta(clave)}
              </legend>
              <div className="grilla-checkbox">
                <CamposFichaRecursivo schema={definicion} path={rutaActual} valores={valores} onCambio={onCambio} />
              </div>
            </fieldset>
          );
        }

        const valorActual = obtenerValorAnidado(valores, rutaActual) ?? '';
        const tipoInput = definicion === 'number' ? 'number' : definicion === 'date' ? 'date' : 'text';

        return (
          <label key={rutaId} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {formatearEtiqueta(clave)}
            <input
              type={tipoInput}
              step={tipoInput === 'number' ? '0.25' : undefined}
              value={valorActual}
              onChange={(e) => onCambio(rutaActual, e.target.value)}
            />
          </label>
        );
      })}
    </>
  );
}

function DetalleCliente({ clienteId, token, camposFicha, categoriasProductoSugeridas, onCerrar, onCambio }) {
  const [cliente, setCliente] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [fichaValores, setFichaValores] = useState({});

  const [descripcionVenta, setDescripcionVenta] = useState('');
  const [montoVenta, setMontoVenta] = useState('');
  const [categoriaVenta, setCategoriaVenta] = useState('');
  const [registrandoVenta, setRegistrandoVenta] = useState(false);

  function cargar() {
    setCargando(true);
    fetchCliente(token, clienteId)
      .then((data) => {
        setCliente(data.cliente);
        setNombre(data.cliente.nombre || '');
        setRut(data.cliente.rut || '');
        setTelefono(data.cliente.telefono || '');
        setEmail(data.cliente.email || '');
        setFichaValores(data.cliente.fichaJson || {});
      })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }

  useEffect(() => { cargar(); }, [clienteId]); // eslint-disable-line react-hooks/exhaustive-deps

  function actualizarCampoFicha(path, valor) {
    setFichaValores((prev) => setValorAnidado(prev, path, valor));
  }

  async function guardarDatos(e) {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      await actualizarCliente(token, clienteId, { nombre, rut, telefono, email, fichaJson: fichaValores });
      cargar();
      onCambio();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

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
      });
      setDescripcionVenta('');
      setMontoVenta('');
      setCategoriaVenta('');
      cargar();
      onCambio();
    } catch (err) {
      setError(err.message);
    } finally {
      setRegistrandoVenta(false);
    }
  }

  if (cargando) return <p className="texto-muted">Cargando…</p>;
  if (!cliente) return null;

  return (
    <div className="panel-segmentacion-puntual" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>{cliente.nombre}</h3>
        <button type="button" className="link-toggle" onClick={onCerrar}>Cerrar</button>
      </div>

      {error && <p className="mensaje-error">{error}</p>}

      <form className="form-campana" onSubmit={guardarDatos} style={{ marginTop: 14 }}>
        <label>
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </label>
        <label>
          RUT
          <input value={rut} onChange={(e) => setRut(e.target.value)} placeholder="12345678-9" />
        </label>
        <label>
          Teléfono
          <input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </label>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <p className="campo-seccion-titulo" style={{ marginTop: 10 }}>Ficha</p>
        <CamposFichaRecursivo schema={camposFicha} path={[]} valores={fichaValores} onCambio={actualizarCampoFicha} />

        <button type="submit" disabled={guardando} style={{ marginTop: 10 }}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>

      <p className="campo-seccion-titulo" style={{ marginTop: 20 }}>Registrar nueva venta/atención</p>
      <form className="form-inline" onSubmit={manejarRegistrarVenta}>
        <input
          placeholder="Descripción (ej. Lentes progresivos Ray-Ban)"
          value={descripcionVenta}
          onChange={(e) => setDescripcionVenta(e.target.value)}
          required
        />
        <input
          type="number" min="0" placeholder="Monto CLP"
          value={montoVenta}
          onChange={(e) => setMontoVenta(e.target.value)}
          required
        />
        {categoriasProductoSugeridas.length > 0 && (
          <select value={categoriaVenta} onChange={(e) => setCategoriaVenta(e.target.value)}>
            <option value="">Categoría (opcional)</option>
            {categoriasProductoSugeridas.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}
        <button type="submit" disabled={registrandoVenta}>
          {registrandoVenta ? 'Registrando…' : 'Registrar venta'}
        </button>
      </form>

      <p className="campo-seccion-titulo" style={{ marginTop: 20 }}>Historial de ventas</p>
      {cliente.ventas.length === 0 ? (
        <p className="texto-muted">Sin ventas registradas todavía.</p>
      ) : (
        <table className="tabla-simple">
          <thead><tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th>Monto</th></tr></thead>
          <tbody>
            {cliente.ventas.map((v) => (
              <tr key={v.id}>
                <td>{formatearFecha(v.creadoEn)}</td>
                <td>{v.descripcion}</td>
                <td>{v.categoriaProducto || '—'}</td>
                <td>${v.monto.toLocaleString('es-CL')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function Clientes() {
  const { token } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [config, setConfig] = useState({ camposFicha: {}, categoriasProductoSugeridas: [] });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState(null);

  const [nombreNuevo, setNombreNuevo] = useState('');
  const [rutNuevo, setRutNuevo] = useState('');
  const [telefonoNuevo, setTelefonoNuevo] = useState('');
  const [creando, setCreando] = useState(false);

  function cargar() {
    setCargando(true);
    Promise.all([fetchClientes(token), fetchConfigClientes(token)])
      .then(([dataClientes, dataConfig]) => {
        setClientes(dataClientes.clientes);
        setConfig(dataConfig);
      })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function manejarCrear(e) {
    e.preventDefault();
    if (!nombreNuevo.trim()) return;
    setCreando(true);
    setError('');
    try {
      const data = await crearCliente(token, { nombre: nombreNuevo, rut: rutNuevo, telefono: telefonoNuevo });
      setNombreNuevo(''); setRutNuevo(''); setTelefonoNuevo('');
      cargar();
      setClienteSeleccionadoId(data.cliente.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreando(false);
    }
  }

  return (
    <div>
      <h1>Pacientes / Clientes</h1>
      <p className="pagina-sub">
        Carga y administra la ficha de tus pacientes/clientes, y registra cada venta o atención
        para poder segmentar campañas más adelante.
      </p>

      {error && <p className="mensaje-error">{error}</p>}

      <form className="form-inline" onSubmit={manejarCrear}>
        <input placeholder="Nombre completo" value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} required />
        <input placeholder="RUT (opcional)" value={rutNuevo} onChange={(e) => setRutNuevo(e.target.value)} />
        <input placeholder="Teléfono (opcional)" value={telefonoNuevo} onChange={(e) => setTelefonoNuevo(e.target.value)} />
        <button type="submit" disabled={creando}>{creando ? 'Creando…' : 'Nuevo paciente/cliente'}</button>
      </form>

      {cargando ? (
        <p className="texto-muted">Cargando…</p>
      ) : clientes.length === 0 ? (
        <p className="texto-muted">Todavía no tienes pacientes/clientes cargados.</p>
      ) : (
        <table className="tabla-simple" style={{ marginTop: 16 }}>
          <thead><tr><th>Nombre</th><th>RUT</th><th>Teléfono</th><th>Ventas</th><th>Total gastado</th><th>Última compra</th><th></th></tr></thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id}>
                <td>{c.nombre}</td>
                <td>{c.rut || '—'}</td>
                <td>{c.telefono || '—'}</td>
                <td>{c.numVentas}</td>
                <td>${c.totalGastado.toLocaleString('es-CL')}</td>
                <td>{formatearFecha(c.ultimaCompraFecha)}</td>
                <td className="acciones">
                  <button className="btn-link" onClick={() => setClienteSeleccionadoId(c.id)}>Ver / Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {clienteSeleccionadoId && (
        <DetalleCliente
          clienteId={clienteSeleccionadoId}
          token={token}
          camposFicha={config.camposFicha}
          categoriasProductoSugeridas={config.categoriasProductoSugeridas}
          onCerrar={() => setClienteSeleccionadoId(null)}
          onCambio={cargar}
        />
      )}

      <style>{`
        h1 {
          font-size: 1.8rem;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 8px 0;
        }
        .pagina-sub {
          font-size: 0.95rem;
          color: #6b7770;
          margin: 0 0 24px 0;
          line-height: 1.5;
        }
        .mensaje-error {
          background: #fde8e8;
          border: 1px solid #f5c4c4;
          border-radius: 6px;
          padding: 12px 16px;
          color: #c94e4e;
          font-size: 0.9rem;
          margin-bottom: 16px;
        }
        .texto-muted {
          color: #999;
          font-size: 0.9rem;
        }
        .form-inline {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          flex-wrap: wrap;
          align-items: flex-end;
        }
        .form-inline input,
        .form-inline select {
          padding: 10px 12px;
          border: 1px solid #d4ccc0;
          border-radius: 4px;
          font-size: 0.9rem;
          font-family: inherit;
          flex: 1;
          min-width: 150px;
        }
        .form-inline input:focus,
        .form-inline select:focus {
          outline: none;
          border-color: #2f6f62;
          box-shadow: 0 0 0 3px rgba(47, 111, 98, 0.1);
        }
        .form-inline button {
          padding: 10px 16px;
          background: #2f6f62;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .form-inline button:hover:not(:disabled) {
          background: #1f4e44;
        }
        .form-inline button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .tabla-simple {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border: 1px solid #dad4c0;
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 20px;
        }
        .tabla-simple thead {
          background: #f0eee2;
          border-bottom: 1px solid #dad4c0;
        }
        .tabla-simple th {
          padding: 12px 16px;
          text-align: left;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #6b7770;
        }
        .tabla-simple td {
          padding: 12px 16px;
          border-bottom: 1px solid #f0eee2;
          font-size: 0.9rem;
          color: #1a1a1a;
        }
        .tabla-simple tbody tr:last-child td {
          border-bottom: none;
        }
        .tabla-simple tbody tr:hover {
          background: #faf8ef;
        }
        .tabla-simple .acciones {
          text-align: right;
        }
        .tabla-simple .btn-link {
          padding: 6px 12px;
          background: transparent;
          color: #2f6f62;
          border: 1px solid #2f6f62;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .tabla-simple .btn-link:hover {
          background: #2f6f62;
          color: white;
        }
        .panel-segmentacion-puntual {
          background: white;
          border: 1px solid #dad4c0;
          border-radius: 6px;
          padding: 20px;
          margin-top: 24px;
        }
        .panel-segmentacion-puntual h3 {
          font-size: 1.2rem;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 16px 0;
        }
        .panel-segmentacion-puntual .link-toggle {
          padding: 6px 12px;
          background: transparent;
          color: #2f6f62;
          border: 1px solid #2f6f62;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .panel-segmentacion-puntual .link-toggle:hover {
          background: #2f6f62;
          color: white;
        }
        .form-campana {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .form-campana label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          color: #1a1a1a;
        }
        .form-campana input,
        .form-campana select,
        .form-campana textarea {
          padding: 10px 12px;
          border: 1px solid #d4ccc0;
          border-radius: 4px;
          font-size: 0.9rem;
          font-family: inherit;
        }
        .form-campana input:focus,
        .form-campana select:focus,
        .form-campana textarea:focus {
          outline: none;
          border-color: #2f6f62;
          box-shadow: 0 0 0 3px rgba(47, 111, 98, 0.1);
        }
        .form-campana button {
          padding: 10px 16px;
          background: #2f6f62;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .form-campana button:hover:not(:disabled) {
          background: #1f4e44;
        }
        .form-campana button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .campo-seccion-titulo {
          font-size: 0.95rem;
          font-weight: 700;
          color: #1a1a1a;
          margin: 20px 0 12px 0;
          text-transform: none;
        }
        .ficha-subgrupo {
          border: 1px solid #dad4c0 !important;
          border-radius: 4px !important;
          padding: 12px !important;
          margin-top: 8px !important;
          background: #faf8ef;
        }
        .ficha-subgrupo legend {
          font-size: 0.75rem !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.04em !important;
          color: #6b7770 !important;
          padding: 0 8px !important;
        }
        .grilla-checkbox {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 8px;
        }
        .grilla-checkbox label {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .grilla-checkbox input {
          padding: 8px 10px;
          border: 1px solid #d4ccc0;
          border-radius: 4px;
          font-size: 0.9rem;
        }
        .grilla-checkbox input:focus {
          outline: none;
          border-color: #2f6f62;
          box-shadow: 0 0 0 3px rgba(47, 111, 98, 0.1);
        }
        @media (max-width: 768px) {
          h1 { font-size: 1.4rem; }
          .pagina-sub { font-size: 0.9rem; }
          .form-inline { flex-direction: column; gap: 10px; }
          .form-inline input, .form-inline select, .form-inline button { width: 100%; min-width: auto; }
          .tabla-simple { font-size: 0.8rem; }
          .tabla-simple th, .tabla-simple td { padding: 10px 12px; }
          .tabla-simple .acciones { text-align: left; }
          .panel-segmentacion-puntual { padding: 16px; margin-top: 20px; }
          .panel-segmentacion-puntual h3 { font-size: 1rem; }
          .form-campana { gap: 12px; }
          .grilla-checkbox { grid-template-columns: 1fr; }
          .campo-seccion-titulo { margin-top: 16px; margin-bottom: 10px; }
        }
      `}</style>
    </div>
  );
}
