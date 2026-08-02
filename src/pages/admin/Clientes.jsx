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
            <fieldset key={rutaId} className="ficha-subgrupo">
              <legend>{formatearEtiqueta(clave)}</legend>
              <div className="ficha-campos">
                <CamposFichaRecursivo schema={definicion} path={rutaActual} valores={valores} onCambio={onCambio} />
              </div>
            </fieldset>
          );
        }

        const valorActual = obtenerValorAnidado(valores, rutaActual) ?? '';
        const tipoInput = definicion === 'number' ? 'number' : definicion === 'date' ? 'date' : 'text';

        return (
          <label key={rutaId} className="ficha-field">
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

function DetalleCliente({
  clienteId,
  token,
  camposFicha,
  categoriasProductoSugeridas,
  onCerrar,
  onCambio,
}) {
  const [cliente, setCliente] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [tabActiva, setTabActiva] = useState('datos');

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

  useEffect(() => {
    cargar();
  }, [clienteId]); // eslint-disable-line react-hooks/exhaustive-deps

  function actualizarCampoFicha(path, valor) {
    setFichaValores((prev) => setValorAnidado(prev, path, valor));
  }

  async function guardarDatos(e) {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      await actualizarCliente(token, clienteId, {
        nombre,
        rut,
        telefono,
        email,
        fichaJson: fichaValores,
      });
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

  if (cargando) return <div className="cliente-detalle-cargando">Cargando…</div>;
  if (!cliente) return null;

  return (
    <div className="cliente-detalle-panel">
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
          className={`tab ${tabActiva === 'historial' ? 'active' : ''}`}
          onClick={() => setTabActiva('historial')}
        >
          Historial
        </button>
        <button
          type="button"
          className={`tab ${tabActiva === 'ficha' ? 'active' : ''}`}
          onClick={() => setTabActiva('ficha')}
        >
          Ficha
        </button>
      </div>

      {/* TAB: DATOS */}
      {tabActiva === 'datos' && (
        <form className="cliente-tab-content" onSubmit={guardarDatos}>
          <div className="form-group">
            <label>Nombre</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>RUT</label>
            <input
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              placeholder="12345678-9"
            />
          </div>
          <div className="form-group">
            <label>Teléfono</label>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button type="submit" disabled={guardando} className="btn-guardar">
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </form>
      )}

      {/* TAB: HISTORIAL */}
      {tabActiva === 'historial' && (
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
              <button type="submit" disabled={registrandoVenta}>
                {registrandoVenta ? 'Registrando…' : 'Registrar'}
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
                    <div className="historial-item-fecha">{formatearFecha(v.creadoEn)}</div>
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

      {/* TAB: FICHA */}
      {tabActiva === 'ficha' && (
        <form className="cliente-tab-content cliente-ficha-form" onSubmit={guardarDatos}>
          <CamposFichaRecursivo
            schema={camposFicha}
            path={[]}
            valores={fichaValores}
            onCambio={actualizarCampoFicha}
          />
          <button type="submit" disabled={guardando} className="btn-guardar">
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function Clientes() {
  const { token } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [config, setConfig] = useState({
    camposFicha: {},
    categoriasProductoSugeridas: [],
  });
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

  useEffect(() => {
    cargar();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
          Carga y administra fichas de pacientes/clientes, y registra ventas
          para segmentar campañas.
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

      {cargando ? (
        <div className="clientes-loading">Cargando…</div>
      ) : clientes.length === 0 ? (
        <div className="clientes-vacio">No hay pacientes/clientes todavía.</div>
      ) : (
        <div className="clientes-lista">
          {clientes.map((c) => (
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
                    {c.ultimaCompraFecha
                      ? formatearFechaCorta(c.ultimaCompraFecha)
                      : '—'}
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
          camposFicha={config.camposFicha}
          categoriasProductoSugeridas={config.categoriasProductoSugeridas}
          onCerrar={() => setClienteSeleccionadoId(null)}
          onCambio={cargar}
        />
      )}
    </div>
  );
}
