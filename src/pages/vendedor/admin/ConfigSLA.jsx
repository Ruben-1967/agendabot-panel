import { useEffect, useState } from 'react';
import { useVendedorAuth } from '../../../context/VendedorAuthContext';
import { fetchConfigSLA, guardarConfigSLA } from '../../../api/client';
import NavVendedor from '../NavVendedor';
import '../vendedor.css';

const ETIQUETA_TIPO = { CALIENTE: 'Leads calientes (probó el sistema / demo personalizada)', FRIO: 'Leads fríos' };

export default function ConfigSLA() {
  const { token } = useVendedorAuth();
  const [config, setConfig] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    fetchConfigSLA(token)
      .then((data) => setConfig(data.config || []))
      .catch((err) => setError(err.message || 'No se pudo cargar la configuración'))
      .finally(() => setCargando(false));
  }, [token]);

  function actualizar(tipoLead, campo, valor) {
    setConfig((prev) => prev.map((c) => (c.tipoLead === tipoLead ? { ...c, [campo]: Number(valor) } : c)));
  }

  async function manejarGuardar() {
    setGuardando(true);
    setError('');
    setGuardado(false);
    try {
      await guardarConfigSLA(token, config);
      setGuardado(true);
    } catch (err) {
      setError(err.message || 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="pantalla-vendedor">
      <NavVendedor />
      <div className="vendedor-inner">
        <h1>Configuración de SLA / aging</h1>
        <p className="texto-ayuda">Umbrales en días para pasar de OK a por vencer (🟡) y a vencido (🔴), separados por primer contacto y por avance tras el primer contacto.</p>

        {error && <p className="login-error">{error}</p>}
        {guardado && <p className="aviso-guardado">Guardado.</p>}
        {cargando && <p>Cargando…</p>}

        {!cargando && config.map((c) => (
          <div key={c.tipoLead} className="form-vendedor" style={{ marginBottom: 18 }}>
            <p className="campo-seccion-titulo">{ETIQUETA_TIPO[c.tipoLead] || c.tipoLead}</p>

            <label>
              Días para primer contacto — 🟡 por vencer
              <input type="number" value={c.diasPrimerContactoAmarillo} onChange={(e) => actualizar(c.tipoLead, 'diasPrimerContactoAmarillo', e.target.value)} />
            </label>
            <label>
              Días para primer contacto — 🔴 vencido
              <input type="number" value={c.diasPrimerContactoRojo} onChange={(e) => actualizar(c.tipoLead, 'diasPrimerContactoRojo', e.target.value)} />
            </label>
            <label>
              Días sin avance tras contacto — 🟡 se enfría
              <input type="number" value={c.diasAgingAmarillo} onChange={(e) => actualizar(c.tipoLead, 'diasAgingAmarillo', e.target.value)} />
            </label>
            <label>
              Días sin avance tras contacto — 🔴 crítico
              <input type="number" value={c.diasAgingRojo} onChange={(e) => actualizar(c.tipoLead, 'diasAgingRojo', e.target.value)} />
            </label>
          </div>
        ))}

        {!cargando && (
          <button className="cta-primaria" onClick={manejarGuardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        )}
      </div>
    </div>
  );
}
