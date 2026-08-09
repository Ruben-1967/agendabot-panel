import { useEffect, useState } from 'react';
import { useVendedorAuth } from '../../context/VendedorAuthContext';
import { fetchProspectosDemo, eliminarProspectoDemo, marcarProspectoContactado, convertirClienteReal } from '../../api/client';
import NavVendedor from './NavVendedor';
import './vendedor.css';

function formatearFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

const ETIQUETA_SLA = { ROJO: '🔴 Vencido', AMARILLO: '🟡 Por vencer', OK: '⚪ Al día' };
const ETIQUETA_TIPO_LEAD = { CALIENTE: 'Caliente', FRIO: 'Frío' };
const ETIQUETA_FASE = { primer_contacto: 'sin primer contacto', aging: 'sin avance' };

export default function MisDemos() {
  const { token } = useVendedorAuth();

  const [demos, setDemos] = useState([]);
  const [contadorVencidos, setContadorVencidos] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [eliminandoId, setEliminandoId] = useState(null);
  const [procesandoId, setProcesandoId] = useState(null);

  const [filtroEstadoSLA, setFiltroEstadoSLA] = useState('');
  const [filtroTipoLead, setFiltroTipoLead] = useState('');

  function cargar() {
    setCargando(true);
    fetchProspectosDemo(token, { estadoSLA: filtroEstadoSLA, tipoLead: filtroTipoLead })
      .then((data) => {
        setDemos(data.demos || []);
        setContadorVencidos(data.contadorVencidos || 0);
      })
      .catch((err) => setError(err.message || 'No se pudo cargar el listado'))
      .finally(() => setCargando(false));
  }

  useEffect(() => { cargar(); }, [token, filtroEstadoSLA, filtroTipoLead]); // eslint-disable-line react-hooks/exhaustive-deps

  async function manejarEliminar(demo) {
    const confirmado = window.confirm(
      `¿Eliminar la demo de "${demo.nombreNegocio}" (${demo.telefono})? El teléfono queda libre de inmediato para una demo nueva — el historial se conserva internamente para reportes futuros.`
    );
    if (!confirmado) return;

    setEliminandoId(demo.id);
    setError('');
    try {
      await eliminarProspectoDemo(token, demo.id);
      setDemos((prev) => prev.filter((d) => d.id !== demo.id));
    } catch (err) {
      setError(err.message || 'No se pudo eliminar la demo');
    } finally {
      setEliminandoId(null);
    }
  }

  async function manejarMarcarContactado(demo) {
    setProcesandoId(demo.id);
    setError('');
    try {
      await marcarProspectoContactado(token, demo.id);
      cargar();
    } catch (err) {
      setError(err.message || 'No se pudo marcar el contacto');
    } finally {
      setProcesandoId(null);
    }
  }

  async function manejarConvertir(demo) {
    const confirmado = window.confirm(
      `¿Convertir a "${demo.nombreNegocio}" en cliente real? Se le enviará por WhatsApp un link para que defina su propia contraseña y elija un plan.`
    );
    if (!confirmado) return;

    setProcesandoId(demo.id);
    setError('');
    try {
      await convertirClienteReal(token, demo.id);
      cargar();
    } catch (err) {
      setError(err.message || 'No se pudo convertir a cliente real');
    } finally {
      setProcesandoId(null);
    }
  }

  return (
    <div className="pantalla-vendedor">
      <NavVendedor />
      <div className="vendedor-inner">
        <h1>Mis casos</h1>

        {contadorVencidos > 0 && (
          <span className="badge-vencidos">🔴 {contadorVencidos} lead{contadorVencidos === 1 ? '' : 's'} vencido{contadorVencidos === 1 ? '' : 's'}</span>
        )}

        <div className="barra-filtros">
          <select value={filtroEstadoSLA} onChange={(e) => setFiltroEstadoSLA(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="ROJO">🔴 Vencidos</option>
            <option value="AMARILLO">🟡 Por vencer</option>
            <option value="OK">⚪ Al día</option>
          </select>
          <select value={filtroTipoLead} onChange={(e) => setFiltroTipoLead(e.target.value)}>
            <option value="">Caliente y frío</option>
            <option value="CALIENTE">Solo calientes</option>
            <option value="FRIO">Solo fríos</option>
          </select>
        </div>

        {error && <p className="login-error">{error}</p>}
        {cargando && <p>Cargando…</p>}

        {!cargando && demos.length === 0 && (
          <p className="texto-ayuda">No hay casos que calcen con este filtro.</p>
        )}

        <ul className="lista-demos">
          {demos.map((d) => (
            <li key={d.id} className="tarjeta-demo">
              <div className="tarjeta-demo-header">
                <strong>{d.nombreNegocio}</strong>
                <span className={`badge-sla badge-sla-${d.estadoSLA.toLowerCase()}`}>
                  {ETIQUETA_SLA[d.estadoSLA]}
                </span>
              </div>
              <p>{d.nombreEncargado} · {d.telefono}</p>
              <p className="texto-ayuda">{d.rubro} · {ETIQUETA_TIPO_LEAD[d.tipoLead]} · {d.diasEnEstado} día{d.diasEnEstado === 1 ? '' : 's'} {ETIQUETA_FASE[d.fase]}</p>
              <p className="texto-ayuda">
                Cargada: {formatearFecha(d.creadoEn)}
                {d.yaProbo && ' · Ya probó el sistema'}
              </p>

              <div className="tarjeta-demo-acciones">
                <button
                  className="cta-secundaria"
                  onClick={() => manejarMarcarContactado(d)}
                  disabled={procesandoId === d.id}
                >
                  {procesandoId === d.id ? 'Guardando…' : 'Marcar como contactado'}
                </button>
                <button
                  className="cta-secundaria"
                  onClick={() => manejarConvertir(d)}
                  disabled={procesandoId === d.id}
                >
                  Convertir a cliente real
                </button>
                <button
                  className="btn-link btn-danger"
                  onClick={() => manejarEliminar(d)}
                  disabled={eliminandoId === d.id}
                >
                  {eliminandoId === d.id ? 'Eliminando…' : 'Eliminar'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
