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

// ------------------------------------------------------------
// Formulario de ficha dinámica según el rubro (ej. receta óptica) — se
// arma solo a partir de RubroTemplate.camposFicha, sin código distinto
// por rubro.
// ------------------------------------------------------------
function CamposFichaDinamicos({ camposFicha, valores, onCambio }) {
  if (!camposFicha || camposFicha.length === 0) return null;
  return (
    <div className="grilla-checkbox" style={{ marginTop: 10 }}>
      {camposFicha.map((campo) => (
        <label key={campo.clave} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {campo.etiqueta}
          <input
            value={valores[campo.clave] || ''}
            onChange={(e) => onCambio(campo.clave, e.target.value)}
          />
        </label>
      ))}
    </div>
  );
}

// ------------------------------------------------------------
// Detalle de un cliente: editar datos + ficha + historial de ventas +
// registrar una venta nueva.
// ------------------------------------------------------------
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
        <CamposFichaDinamicos
          camposFicha={camposFicha}
          valores={fichaValores}
          onCambio={(clave, valor) => setFichaValores((prev) => ({ ...prev, [clave]: valor }))}
        />

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

// ------------------------------------------------------------
// Página principal
// ------------------------------------------------------------
export default function Clientes() {
  const { token } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [config, setConfig] = useState({ camposFicha: [], categoriasProductoSugeridas: [] });
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
    </div>
  );
}