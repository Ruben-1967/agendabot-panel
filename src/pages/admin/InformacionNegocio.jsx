import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchInfoNegocio, actualizarInfoNegocio, fetchServicios } from '../../api/client';
import Servicios from '../../components/Servicios';

export default function InformacionNegocio() {
  const { token } = useAuth();
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [guardadoOk, setGuardadoOk] = useState(false);

  const [direccion, setDireccion] = useState('');
  const [notaAgendamiento, setNotaAgendamiento] = useState('');
  const [informacionAdicional, setInformacionAdicional] = useState('');
  const [requiereRut, setRequiereRut] = useState(false);
  const [tonoComunicacion, setTonoComunicacion] = useState('Neutral');

  const [servicios, setServicios] = useState([]);

  function cargarServicios() {
    return fetchServicios(token).then((data) => setServicios(data.servicios || [])).catch((err) => setError(err.message));
  }

  useEffect(() => {
    fetchInfoNegocio(token)
      .then((data) => {
        setDireccion(data.direccion || '');
        setNotaAgendamiento(data.notaAgendamiento || '');
        setInformacionAdicional(data.informacionAdicional || '');
        setRequiereRut(!!data.requiereRut);
        setTonoComunicacion(data.tonoComunicacion || 'Neutral');
      })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
    cargarServicios();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function manejarGuardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError('');
    setGuardadoOk(false);
    try {
      await actualizarInfoNegocio(token, { direccion, notaAgendamiento, informacionAdicional, requiereRut, tonoComunicacion });
      setGuardadoOk(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <p className="texto-muted">Cargando…</p>;

  return (
    <div>
      <h1>Información del negocio</h1>
      <p className="pagina-sub">Esto lo usa directamente el chatbot cuando responde por WhatsApp — cárgalo con cuidado, ya que el bot puede citar textual lo que pongas en "Información adicional".</p>

      {error && <p className="mensaje-error">{error}</p>}
      {guardadoOk && <p className="mensaje-ok">Guardado correctamente.</p>}

      <form className="form-campana" style={{ maxWidth: 560 }} onSubmit={manejarGuardar}>
        <label>
          Dirección
          <input
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Ej. Av. O'Higgins #546, comuna de Lautaro"
          />
        </label>

        <label>
          Nota de agendamiento
          <input
            value={notaAgendamiento}
            onChange={(e) => setNotaAgendamiento(e.target.value)}
            placeholder="Ej. Cupos limitados, avisar con anticipación si no puede asistir."
          />
          <span className="texto-ayuda">El bot puede usar este texto como referencia de tono al confirmar o recordar una cita.</span>
        </label>

        <label>
          Información adicional (precios, promociones, qué incluye cada servicio)
          <textarea
            rows={6}
            value={informacionAdicional}
            onChange={(e) => setInformacionAdicional(e.target.value)}
            placeholder="Ej. Examen + receta $15.000 normal. $5.000 si se compra lente completo el mismo día…"
          />
          <span className="texto-ayuda">El bot cita esto TAL CUAL cuando un cliente pregunta — no inventa nada fuera de lo que escribas acá.</span>
        </label>

        <label className="checkbox-segmentacion" style={{ padding: '4px 0' }}>
          <input type="checkbox" checked={requiereRut} onChange={(e) => setRequiereRut(e.target.checked)} />
          Exigir RUT del cliente antes de agendar una cita
        </label>
        
        <label>
          Tono de comunicación
          <select value={tonoComunicacion} onChange={(e) => setTonoComunicacion(e.target.value)}>
            <option value="Formal">Formal — profesional y respetuoso</option>
            <option value="Neutral">Neutral — equilibrado (recomendado)</option>
            <option value="Informal">Informal — conversacional y cercano</option>
          </select>
          <span className="texto-ayuda">El bot interpretará tu información adicional (precios, promociones) con este tono.</span>
        </label>

        <button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button>
      </form>

      <h2 className="subtitulo">Servicios</h2>
      <Servicios servicios={servicios} token={token} onCambio={cargarServicios} setError={setError} />
    </div>
  );
}
