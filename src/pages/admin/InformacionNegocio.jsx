import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchInfoNegocio, actualizarInfoNegocio, actualizarOptInMarketing, fetchServicios, fetchEjemplosFormulario } from '../../api/client';
import Servicios from '../../components/Servicios';

const TEXTO_COMPROMISO = 'Nos comprometemos a usar TotemSystem exclusivamente para responder solicitudes de horas, agendamiento y asesoría directamente relacionada con la atención de nuestros clientes — nunca para enviar publicidad, promociones ni comunicaciones de marketing sin el consentimiento explícito (opt-in) de cada cliente. Entendemos que el incumplimiento de este compromiso puede resultar en la suspensión del servicio.';

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
  const [telefonoContacto, setTelefonoContacto] = useState('');
  const [minutosAlertaUrgente, setMinutosAlertaUrgente] = useState(10);
  const [minutosEsperaOptIn, setMinutosEsperaOptIn] = useState(10);

  const [usaOptInMarketing, setUsaOptInMarketing] = useState(false);
  const [compromisoAceptadoEn, setCompromisoAceptadoEn] = useState(null);
  const [eleccionMarketing, setEleccionMarketing] = useState('no'); // 'si' | 'no' — elección en pantalla, no necesariamente guardada
  const [aceptaCompromiso, setAceptaCompromiso] = useState(false);
  const [guardandoMarketing, setGuardandoMarketing] = useState(false);
  const [errorMarketing, setErrorMarketing] = useState('');
  const [guardadoMarketingOk, setGuardadoMarketingOk] = useState(false);

  const [servicios, setServicios] = useState([]);
  // Ejemplos (placeholder) según el rubro del negocio — antes estos campos
  // mostraban siempre los mismos ejemplos con datos reales de Ahorróptica
  // (dirección real, precios reales de óptica) sin importar el rubro.
  const [ejemplos, setEjemplos] = useState({});

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
        setTelefonoContacto(data.telefonoContacto || '');
        setMinutosAlertaUrgente(data.minutosAlertaUrgente ?? 10);
        setMinutosEsperaOptIn(data.minutosEsperaOptIn ?? 10);
        setUsaOptInMarketing(!!data.usaOptInMarketing);
        setEleccionMarketing(data.usaOptInMarketing ? 'si' : 'no');
        setCompromisoAceptadoEn(data.compromisoSoloAgendamientoAceptadoEn || null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
    cargarServicios();
    fetchEjemplosFormulario(token).then(setEjemplos).catch(() => {});
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function manejarGuardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError('');
    setGuardadoOk(false);
    try {
      await actualizarInfoNegocio(token, { direccion, notaAgendamiento, informacionAdicional, requiereRut, tonoComunicacion, telefonoContacto, minutosAlertaUrgente, minutosEsperaOptIn });
      setGuardadoOk(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function manejarGuardarMarketing(e) {
    e.preventDefault();
    setGuardandoMarketing(true);
    setErrorMarketing('');
    setGuardadoMarketingOk(false);
    try {
      const quiereMarketing = eleccionMarketing === 'si';
      const resultado = await actualizarOptInMarketing(token, {
        usaOptInMarketing: quiereMarketing,
        ...(quiereMarketing ? {} : { aceptaCompromiso }),
      });
      // Un solo clic guarda ambos registros: la elección (arriba) y, si
      // eligió "sí", los minutos de espera (mismo endpoint que el resto de
      // "Información del negocio" — no vale la pena un tercer endpoint solo
      // para este campo).
      if (quiereMarketing) {
        await actualizarInfoNegocio(token, { direccion, notaAgendamiento, informacionAdicional, requiereRut, tonoComunicacion, telefonoContacto, minutosAlertaUrgente, minutosEsperaOptIn });
      }
      setUsaOptInMarketing(resultado.usaOptInMarketing);
      setCompromisoAceptadoEn(resultado.compromisoSoloAgendamientoAceptadoEn || null);
      setAceptaCompromiso(false);
      setGuardadoMarketingOk(true);
    } catch (err) {
      setErrorMarketing(err.message);
    } finally {
      setGuardandoMarketing(false);
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
            placeholder={ejemplos.direccion || 'Ej. Av. Providencia #1234, comuna'}
          />
        </label>

        <label>
          Teléfono de contacto (WhatsApp)
          <input
            value={telefonoContacto}
            onChange={(e) => setTelefonoContacto(e.target.value)}
            placeholder="Ej. +56912345678"
          />
          <span className="texto-ayuda">A este número te llegan los avisos automáticos por WhatsApp — activación de cuenta, y la alerta urgente cuando un cliente lleva esperando hablar con una persona (ver campo de abajo).</span>
        </label>

        <label>
          Minutos de espera antes de la alerta urgente
          <input
            type="number"
            min="0"
            step="1"
            value={minutosAlertaUrgente}
            onChange={(e) => setMinutosAlertaUrgente(e.target.value === '' ? '' : Number(e.target.value))}
          />
          <span className="texto-ayuda">Cuando un cliente pide hablar con una persona y nadie responde, a los 5 min el bot le manda un mensaje de contención al cliente. Este número define cuántos minutos más esperar antes de mandarte a ti la alerta urgente por WhatsApp — pon 0 si quieres que te llegue de inmediato.</span>
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
            placeholder={ejemplos.informacionAdicional || 'Ej. Precios, promociones o detalles que quieras que el bot mencione.'}
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

      <h2 className="subtitulo">Marketing y publicidad</h2>
      <p className="pagina-sub">Define si vas a usar TotemSystem para enviar promociones a tus clientes, o solo para agendamiento y consultas. Esto es importante para cumplir con la Ley 21.719 de protección de datos personales.</p>

      <form className="form-campana" style={{ maxWidth: 560 }} onSubmit={manejarGuardarMarketing}>
        {errorMarketing && <p className="mensaje-error">{errorMarketing}</p>}
        {guardadoMarketingOk && <p className="mensaje-ok">Guardado correctamente.</p>}

        <p className="texto-ayuda">
          {usaOptInMarketing
            ? 'Estado actual: marketing activado — tus clientes reciben la pregunta de opt-in automáticamente.'
            : compromisoAceptadoEn
              ? `Estado actual: solo agendamiento — aceptaste este compromiso el ${new Date(compromisoAceptadoEn).toLocaleDateString('es-CL')}.`
              : 'Estado actual: sin definir todavía.'}
        </p>

        <label className="checkbox-segmentacion" style={{ padding: '4px 0' }}>
          <input
            type="radio"
            name="eleccionMarketing"
            checked={eleccionMarketing === 'si'}
            onChange={() => setEleccionMarketing('si')}
          />
          Sí, quiero poder enviar promociones (activa la pregunta de opt-in a mis clientes)
        </label>
        <label className="checkbox-segmentacion" style={{ padding: '4px 0' }}>
          <input
            type="radio"
            name="eleccionMarketing"
            checked={eleccionMarketing === 'no'}
            onChange={() => setEleccionMarketing('no')}
          />
          No, solo usaré el bot para agendamiento y consultas
        </label>

        {eleccionMarketing === 'no' && (
          <div style={{ background: '#faf6ec', border: '1px solid #e8ddd2', borderRadius: 8, padding: 12 }}>
            <p style={{ fontSize: '0.85rem', margin: '0 0 8px' }}>{TEXTO_COMPROMISO}</p>
            <label className="checkbox-segmentacion" style={{ padding: '4px 0' }}>
              <input type="checkbox" checked={aceptaCompromiso} onChange={(e) => setAceptaCompromiso(e.target.checked)} />
              Acepto este compromiso
            </label>
          </div>
        )}

        {eleccionMarketing === 'si' && (
          <label>
            Minutos de silencio antes de preguntar el opt-in
            <input
              type="number"
              min="0"
              step="1"
              value={minutosEsperaOptIn}
              onChange={(e) => setMinutosEsperaOptIn(e.target.value === '' ? '' : Number(e.target.value))}
            />
            <span className="texto-ayuda">Cuánto tiempo sin que el cliente escriba antes de preguntarle si quiere recibir promociones — para no interrumpir una conversación en curso.</span>
          </label>
        )}

        <button
          type="submit"
          disabled={guardandoMarketing || (eleccionMarketing === 'no' && !aceptaCompromiso)}
        >
          {guardandoMarketing ? 'Guardando…' : 'Guardar elección'}
        </button>
      </form>

      <h2 className="subtitulo">Servicios</h2>
      <Servicios servicios={servicios} token={token} onCambio={cargarServicios} setError={setError} ejemploNombre={ejemplos.ejemploServicio} />
    </div>
  );
}
