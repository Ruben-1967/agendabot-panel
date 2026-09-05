import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchClientes, actualizarCliente } from '../../api/client';

// Vista de solo el estado de opt-in de marketing por cliente — separada de
// "Pacientes/Clientes" (que ya es una tabla grande con ventas/RUT/ficha) para
// no sobrecargarla. Permite corregir a mano el opt-in (ej. el cliente pidió
// que lo saquen por otra vía, o dio consentimiento verbal fuera del bot).
export default function OptInMarketing() {
  const { token } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [actualizandoId, setActualizandoId] = useState(null);
  const [soloAutorizados, setSoloAutorizados] = useState(false);

  function cargar() {
    setCargando(true);
    fetchClientes(token)
      .then((data) => setClientes(data.clientes || []))
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }

  useEffect(cargar, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function alternarOptIn(cliente) {
    const nuevoValor = !cliente.optInCampanas;
    setActualizandoId(cliente.id);
    setClientes((prev) => prev.map((c) => (c.id === cliente.id ? { ...c, optInCampanas: nuevoValor } : c)));
    try {
      await actualizarCliente(token, cliente.id, { optInCampanas: nuevoValor });
    } catch (err) {
      setError(err.message);
      setClientes((prev) => prev.map((c) => (c.id === cliente.id ? { ...c, optInCampanas: !nuevoValor } : c)));
    } finally {
      setActualizandoId(null);
    }
  }

  if (cargando) return <p className="texto-muted">Cargando…</p>;

  const clientesConTelefono = clientes.filter((c) => c.telefono);
  const autorizados = clientesConTelefono.filter((c) => c.optInCampanas);
  const listaAMostrar = soloAutorizados ? autorizados : clientesConTelefono;

  return (
    <div>
      <h1>Opt-in marketing</h1>
      <p className="pagina-sub">
        Clientes que autorizaron recibir promociones y novedades por WhatsApp — {autorizados.length} de {clientesConTelefono.length} con teléfono registrado.
      </p>

      {error && <p className="mensaje-error">{error}</p>}

      <label className="checkbox-segmentacion" style={{ padding: '4px 0', marginBottom: 12, display: 'inline-flex' }}>
        <input type="checkbox" checked={soloAutorizados} onChange={(e) => setSoloAutorizados(e.target.checked)} />
        Mostrar solo autorizados
      </label>

      <div className="tabla-wrap">
        <table className="tabla-simple">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {listaAMostrar.length === 0 && (
              <tr><td colSpan={4}>No hay clientes que mostrar todavía.</td></tr>
            )}
            {listaAMostrar.map((c) => (
              <tr key={c.id}>
                <td>{c.nombre}</td>
                <td>{c.telefono}</td>
                <td>
                  {c.optInCampanas ? (
                    <span className="mensaje-ok" style={{ padding: '2px 8px', borderRadius: 4 }}>Autorizado</span>
                  ) : c.optInCampanasPreguntado ? (
                    <span className="texto-muted">No autorizó</span>
                  ) : (
                    <span className="texto-muted">Sin preguntar todavía</span>
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-link"
                    disabled={actualizandoId === c.id}
                    onClick={() => alternarOptIn(c)}
                  >
                    {c.optInCampanas ? 'Quitar autorización' : 'Autorizar a mano'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
