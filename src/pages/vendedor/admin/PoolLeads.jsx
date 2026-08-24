import { useEffect, useState } from 'react';
import { useVendedorAuth } from '../../../context/VendedorAuthContext';
import { fetchLeadsPool, asignarLeadAVendedor, fetchVendedores } from '../../../api/client';
import NavVendedor from '../NavVendedor';
import '../vendedor.css';

function formatFechaHora(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const ETIQUETAS_ORIGEN = { whatsapp_demo: 'WhatsApp (demo)', email_campana: 'Email (campaña)' };

function TarjetaLeadPool({ lead, vendedoresActivos, vendedorElegidoId, onCambiarVendedorElegido, onAsignar, procesando, expandido, onToggle }) {
  return (
    <div className="tarjeta-vendedor-admin-wrap">
      <div className="tarjeta-vendedor-admin" onClick={onToggle} role="button" tabIndex={0}>
        <div className="tarjeta-vendedor-admin-info">
          <strong>{lead.nombreProspecto || lead.telefono || lead.email || 'Sin nombre'}</strong>
          <span className="texto-muted">{lead.rubro || 'Rubro sin registrar'} · {ETIQUETAS_ORIGEN[lead.origen] || lead.origen}</span>
          <span className="texto-muted">
            {lead.diasInteraccion} día{lead.diasInteraccion === 1 ? '' : 's'} de interacción · última vez {formatFechaHora(lead.ultimaInteraccionEn)}
          </span>
        </div>
        <div className="tarjeta-vendedor-admin-derecha">
          {lead.intencionDetectada && <span className="badge-exito">Preguntó precio</span>}
          <span className="btn-link">{expandido ? 'Ocultar' : 'Ver más'}</span>
        </div>
      </div>
      {expandido && (
        <div className="detalle-vendedor-admin">
          <h3 className="subtitulo-tarjeta">Resumen</h3>
          <p className="texto-ayuda" style={{ margin: '0 0 4px' }}>Teléfono: {lead.telefono || '—'}</p>
          <p className="texto-ayuda" style={{ margin: '0 0 4px' }}>Email: {lead.email || '—'}</p>
          <p className="texto-ayuda" style={{ margin: '0 0 4px' }}>Motivo de derivación: {lead.motivoDerivacion || '—'}</p>
          <p className="texto-ayuda" style={{ marginBottom: 16 }}>Último mensaje: {lead.ultimoMensajeResumen || '—'}</p>

          {Array.isArray(lead.ultimosTurnos) && lead.ultimosTurnos.length > 0 && (
            <>
              <h3 className="subtitulo-tarjeta">Últimos turnos de la conversación</h3>
              <div className="lista-vendedores-admin" style={{ marginBottom: 16 }}>
                {lead.ultimosTurnos.map((turno, i) => (
                  <p key={i} className="texto-ayuda" style={{ margin: '0 0 6px' }}>
                    <strong>{turno.rol === 'prospecto' ? 'Cliente' : 'Bot'}:</strong> {turno.texto}
                  </p>
                ))}
              </div>
            </>
          )}

          <h3 className="subtitulo-tarjeta">Asignar a un vendedor</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={vendedorElegidoId || ''}
              onChange={(e) => { e.stopPropagation(); onCambiarVendedorElegido(e.target.value); }}
              onClick={(e) => e.stopPropagation()}
              disabled={procesando}
            >
              <option value="">Elige un vendedor…</option>
              {vendedoresActivos.map((v) => (
                <option key={v.id} value={v.id}>{v.nombre}</option>
              ))}
            </select>
            <button
              type="button"
              className="cta-primaria"
              onClick={(e) => { e.stopPropagation(); onAsignar(lead); }}
              disabled={procesando || !vendedorElegidoId}
            >
              {procesando ? 'Asignando…' : 'Asignar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PoolLeads() {
  const { token } = useVendedorAuth();
  const [leads, setLeads] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [expandidoId, setExpandidoId] = useState(null);
  const [vendedorElegidoPorLead, setVendedorElegidoPorLead] = useState({});
  const [procesandoId, setProcesandoId] = useState(null);

  function cargar() {
    setCargando(true);
    setError('');
    Promise.all([fetchLeadsPool(token), fetchVendedores(token)])
      .then(([datosLeads, datosVendedores]) => {
        setLeads(datosLeads.leads || []);
        setVendedores(datosVendedores.vendedores || []);
      })
      .catch((err) => setError(err.message || 'No se pudo cargar el pool de leads'))
      .finally(() => setCargando(false));
  }

  useEffect(() => { cargar(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const vendedoresActivos = vendedores.filter((v) => v.activo);

  async function manejarAsignar(lead) {
    const vendedorId = vendedorElegidoPorLead[lead.id];
    if (!vendedorId) return;

    setProcesandoId(lead.id);
    setError('');
    try {
      await asignarLeadAVendedor(token, lead.id, vendedorId);
      setLeads((prev) => prev.filter((l) => l.id !== lead.id));
    } catch (err) {
      if (err.status === 409) {
        setError('Este lead ya no está disponible — puede que se haya asignado desde otra pestaña.');
        cargar();
      } else {
        setError(err.message || 'No se pudo asignar el lead');
      }
    } finally {
      setProcesandoId(null);
    }
  }

  return (
    <div className="pantalla-vendedor">
      <NavVendedor />
      <div className="vendedor-inner">
        <h1>Pool de leads</h1>
        <p className="texto-ayuda">
          Leads orgánicos y de campañas de email sin asignar todavía. Distribúyelos manualmente a un
          vendedor — los vendedores no ven ni toman leads de este pool por su cuenta.
        </p>

        {error && <p className="login-error">{error}</p>}

        {cargando && <p>Cargando…</p>}
        {!cargando && leads.length === 0 && <p className="texto-ayuda">No hay leads sin asignar por el momento.</p>}

        {!cargando && leads.length > 0 && (
          <div className="lista-vendedores-admin">
            {leads.map((lead) => (
              <TarjetaLeadPool
                key={lead.id}
                lead={lead}
                vendedoresActivos={vendedoresActivos}
                vendedorElegidoId={vendedorElegidoPorLead[lead.id]}
                onCambiarVendedorElegido={(vendedorId) => setVendedorElegidoPorLead((prev) => ({ ...prev, [lead.id]: vendedorId }))}
                onAsignar={manejarAsignar}
                procesando={procesandoId === lead.id}
                expandido={expandidoId === lead.id}
                onToggle={() => setExpandidoId(expandidoId === lead.id ? null : lead.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
