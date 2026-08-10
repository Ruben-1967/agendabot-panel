import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useVendedorAuth } from '../../context/VendedorAuthContext';
import { fetchCatalogoGestion, fetchEventosGestion, crearEventoGestion, editarEventoGestion, eliminarEventoGestion } from '../../api/client';
import NavVendedor from './NavVendedor';
import './vendedor.css';

const ETIQUETA_CANAL = { WHATSAPP: 'WhatsApp', LLAMADA: 'Llamada', CORREO: 'Correo', VISITA: 'Visita en terreno', OTRO: 'Otro' };

function formatearFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function GestionVenta() {
  const { demoId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useVendedorAuth();

  const demoInfo = location.state?.demo || null;

  const [catalogo, setCatalogo] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [editandoId, setEditandoId] = useState(null);
  const [canalForm, setCanalForm] = useState('');
  const [resultadoForm, setResultadoForm] = useState('');
  const [motivoForm, setMotivoForm] = useState('');

  function cargar() {
    setCargando(true);
    Promise.all([fetchCatalogoGestion(token), fetchEventosGestion(token, demoId)])
      .then(([datosCatalogo, datosEventos]) => {
        setCatalogo(datosCatalogo);
        setEventos(datosEventos.eventos || []);
      })
      .catch((err) => setError(err.message || 'No se pudo cargar la gestión'))
      .finally(() => setCargando(false));
  }

  useEffect(() => { cargar(); }, [token, demoId]); // eslint-disable-line react-hooks/exhaustive-deps

  function limpiarFormulario() {
    setEditandoId(null);
    setCanalForm('');
    setResultadoForm('');
    setMotivoForm('');
  }

  function empezarEdicion(evento) {
    setEditandoId(evento.id);
    setCanalForm(evento.canal);
    setResultadoForm(evento.resultado);
    setMotivoForm(evento.motivoDescarte || '');
  }

  const resultadosDisponibles = canalForm && catalogo ? catalogo.resultadosPorCanal[canalForm] : [];
  const configResultado = resultadosDisponibles.find((r) => r.clave === resultadoForm) || null;
  const esCierre = configResultado?.esCierre || false;

  async function manejarGuardar(e) {
    e.preventDefault();
    if (!canalForm || !resultadoForm) return;
    if (esCierre && !motivoForm) {
      setError('Elegí un motivo de descarte para "Cerrado — perdido"');
      return;
    }

    setGuardando(true);
    setError('');
    try {
      const datos = { canal: canalForm, resultado: resultadoForm, motivoDescarte: esCierre ? motivoForm : undefined };
      if (editandoId) {
        await editarEventoGestion(token, editandoId, datos);
      } else {
        await crearEventoGestion(token, demoId, datos);
      }
      limpiarFormulario();
      cargar();
    } catch (err) {
      setError(err.message || 'No se pudo guardar la gestión');
    } finally {
      setGuardando(false);
    }
  }

  async function manejarEliminar(evento) {
    const confirmado = window.confirm('¿Eliminar este evento de gestión? Esta acción no se puede deshacer.');
    if (!confirmado) return;

    setGuardando(true);
    setError('');
    try {
      await eliminarEventoGestion(token, evento.id);
      cargar();
    } catch (err) {
      setError(err.message || 'No se pudo eliminar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="pantalla-vendedor">
      <NavVendedor />
      <div className="vendedor-inner">
        <button className="btn-link" onClick={() => navigate('/vendedor/mis-demos')} style={{ marginBottom: 12 }}>
          ← Volver a Mis casos
        </button>

        <h1>Gestión de venta</h1>
        {demoInfo ? (
          <p className="texto-ayuda">{demoInfo.nombreNegocio} · {demoInfo.nombreEncargado} · {demoInfo.telefono}</p>
        ) : (
          <p className="texto-ayuda">Historial y registro de seguimiento de este caso.</p>
        )}

        {error && <p className="login-error">{error}</p>}
        {cargando && <p>Cargando…</p>}

        {!cargando && catalogo && (
          <form onSubmit={manejarGuardar} className="form-vendedor" style={{ marginBottom: 24 }}>
            <p className="campo-seccion-titulo">{editandoId ? 'Editando evento' : 'Registrar nueva gestión'}</p>

            <label>
              Canal
              <select
                value={canalForm}
                onChange={(e) => { setCanalForm(e.target.value); setResultadoForm(''); setMotivoForm(''); }}
                required
              >
                <option value="">-- Elegí un canal --</option>
                {Object.keys(catalogo.resultadosPorCanal).map((canal) => (
                  <option key={canal} value={canal}>{ETIQUETA_CANAL[canal]}</option>
                ))}
              </select>
            </label>

            {canalForm && (
              <label>
                Resultado
                <select value={resultadoForm} onChange={(e) => { setResultadoForm(e.target.value); setMotivoForm(''); }} required>
                  <option value="">-- Elegí un resultado --</option>
                  {resultadosDisponibles.map((r) => (
                    <option key={r.clave} value={r.clave}>{r.etiqueta}</option>
                  ))}
                </select>
              </label>
            )}

            {esCierre && (
              <label>
                Motivo de descarte
                <select value={motivoForm} onChange={(e) => setMotivoForm(e.target.value)} required>
                  <option value="">-- Elegí un motivo --</option>
                  {catalogo.motivosDescarte.map((m) => (
                    <option key={m.clave} value={m.clave}>{m.etiqueta}</option>
                  ))}
                </select>
              </label>
            )}

            {configResultado?.canalSugerido && (
              <p className="texto-ayuda">Sugerencia: la próxima acción recomendada es por {ETIQUETA_CANAL[configResultado.canalSugerido]}.</p>
            )}

            <div className="tarjeta-demo-acciones">
              <button type="submit" className="cta-primaria" disabled={guardando || !canalForm || !resultadoForm}>
                {guardando ? 'Guardando…' : editandoId ? 'Guardar cambios' : 'Registrar'}
              </button>
              {editandoId && (
                <button type="button" className="btn-link" onClick={limpiarFormulario}>Cancelar edición</button>
              )}
            </div>
          </form>
        )}

        <h3>Historial</h3>
        {!cargando && eventos.length === 0 && <p className="texto-ayuda">Todavía no hay gestiones registradas para este caso.</p>}

        <ul className="lista-demos">
          {eventos.map((ev) => {
            const config = catalogo?.resultadosPorCanal[ev.canal]?.find((r) => r.clave === ev.resultado);
            const motivo = catalogo?.motivosDescarte.find((m) => m.clave === ev.motivoDescarte);
            return (
              <li key={ev.id} className="tarjeta-demo">
                <div className="tarjeta-demo-header">
                  <strong>{ETIQUETA_CANAL[ev.canal]}</strong>
                  {ev.reseteaTimer && <span className="badge-exito">Resetea aging</span>}
                </div>
                <p>{config?.etiqueta || ev.resultado}</p>
                {motivo && <p className="texto-ayuda">Motivo: {motivo.etiqueta}</p>}
                <p className="texto-ayuda">{formatearFecha(ev.creadoEn)} · {ev.vendedorNombre}</p>
                <div className="tarjeta-demo-acciones">
                  <button className="cta-secundaria" onClick={() => empezarEdicion(ev)} disabled={guardando}>Editar</button>
                  <button className="btn-link btn-danger" onClick={() => manejarEliminar(ev)} disabled={guardando}>Eliminar</button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
