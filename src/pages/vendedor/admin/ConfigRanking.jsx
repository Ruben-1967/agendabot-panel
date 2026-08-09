import { useEffect, useState } from 'react';
import { useVendedorAuth } from '../../../context/VendedorAuthContext';
import { fetchConfigRanking, guardarConfigRanking } from '../../../api/client';
import NavVendedor from '../NavVendedor';
import '../vendedor.css';

const ETIQUETA_PLAN = { PLAN_INICIO_LEGACY: 'Plan Inicio (legacy)', PLAN_A: 'Plan A', PLAN_B: 'Plan B', PLAN_C: 'Plan C' };

export default function ConfigRanking() {
  const { token } = useVendedorAuth();
  const [premios, setPremios] = useState([]);
  const [metaMinimaGrupalMensual, setMetaMinimaGrupalMensual] = useState(0);
  const [jerarquiaPlanes, setJerarquiaPlanes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    fetchConfigRanking(token)
      .then((data) => {
        setPremios(data.premios || []);
        setMetaMinimaGrupalMensual(data.metaMinimaGrupalMensual ?? 0);
        setJerarquiaPlanes(data.jerarquiaPlanes || []);
      })
      .catch((err) => setError(err.message || 'No se pudo cargar la configuración'))
      .finally(() => setCargando(false));
  }, [token]);

  function actualizarPremio(posicion, campo, valor) {
    setPremios((prev) => prev.map((p) => (p.posicion === posicion ? { ...p, [campo]: valor } : p)));
  }

  function actualizarOrdenPlan(plan, orden) {
    setJerarquiaPlanes((prev) => prev.map((j) => (j.plan === plan ? { ...j, orden: Number(orden) } : j)));
  }

  async function manejarGuardar() {
    setGuardando(true);
    setError('');
    setGuardado(false);
    try {
      await guardarConfigRanking(token, {
        premios: premios.map((p) => ({ posicion: p.posicion, descripcion: p.descripcion, monto: (p.monto === '' || p.monto === null || p.monto === undefined) ? null : Number(p.monto) })),
        metaMinimaGrupalMensual: Number(metaMinimaGrupalMensual),
        jerarquiaPlanes: jerarquiaPlanes.map((j) => ({ plan: j.plan, orden: j.orden })),
      });
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
        <h1>Configuración del ranking</h1>
        <p className="texto-ayuda">Premios por posición, meta grupal mínima del mes y jerarquía de planes para el desempate.</p>

        {error && <p className="login-error">{error}</p>}
        {guardado && <p className="aviso-guardado">Guardado.</p>}
        {cargando && <p>Cargando…</p>}

        {!cargando && (
          <>
            <h3>Premios por posición</h3>
            <table className="tabla-admin-vendedor">
              <thead>
                <tr><th>Posición</th><th>Descripción</th><th>Monto (CLP)</th></tr>
              </thead>
              <tbody>
                {premios.map((p) => (
                  <tr key={p.posicion}>
                    <td>{p.posicion}°</td>
                    <td>
                      <input value={p.descripcion || ''} onChange={(e) => actualizarPremio(p.posicion, 'descripcion', e.target.value)} />
                    </td>
                    <td>
                      <input type="number" value={p.monto ?? ''} onChange={(e) => actualizarPremio(p.posicion, 'monto', e.target.value)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 style={{ marginTop: 24 }}>Meta grupal mínima del mes</h3>
            <p className="texto-ayuda">Si el equipo no llega a esta cantidad de ventas en el mes, no se entregan premios (el ranking se sigue mostrando igual).</p>
            <input
              type="number"
              value={metaMinimaGrupalMensual}
              onChange={(e) => setMetaMinimaGrupalMensual(e.target.value)}
              style={{ maxWidth: 140 }}
            />

            <h3 style={{ marginTop: 24 }}>Jerarquía de planes (desempate)</h3>
            <p className="texto-ayuda">Mayor número = mejor posición al desempatar. Si dos vendedores empatan en cantidad de ventas, gana el que vendió el plan con mayor orden acá.</p>
            <table className="tabla-admin-vendedor">
              <thead><tr><th>Plan</th><th>Orden</th></tr></thead>
              <tbody>
                {jerarquiaPlanes.map((j) => (
                  <tr key={j.plan}>
                    <td>{ETIQUETA_PLAN[j.plan] || j.plan}</td>
                    <td>
                      <input type="number" value={j.orden} onChange={(e) => actualizarOrdenPlan(j.plan, e.target.value)} style={{ maxWidth: 90 }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button className="cta-primaria" style={{ marginTop: 20 }} onClick={manejarGuardar} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
