import { useState } from 'react';
import { crearBloqueo, eliminarBloqueo } from '../api/client';

/**
 * Vacaciones y feriados puntuales de un recurso agendable. Reutilizable
 * para el recurso único de una empresa (ConfiguracionAgenda.jsx, sin
 * recursoId) o para un profesional puntual (GestionProfesionales.jsx,
 * con recursoId).
 */
export default function Bloqueos({ bloqueos, recursoId, token, onCambio, setError }) {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function manejarCrear(e) {
    e.preventDefault();
    if (!fechaInicio || !fechaFin) return;
    setGuardando(true);
    setError('');
    try {
      await crearBloqueo(token, { fechaInicio, fechaFin, motivo: motivo || null, recursoId });
      setFechaInicio('');
      setFechaFin('');
      setMotivo('');
      await onCambio();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function manejarEliminar(id) {
    if (!confirm('¿Eliminar este bloqueo?')) return;
    try {
      await eliminarBloqueo(token, id);
      await onCambio();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <form className="form-inline" onSubmit={manejarCrear}>
        <label className="campo-segmento">Desde <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} required style={{ marginLeft: 6 }} /></label>
        <label className="campo-segmento">Hasta <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} required style={{ marginLeft: 6 }} /></label>
        <input placeholder="Motivo (opcional, ej. Vacaciones)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        <button type="submit" disabled={guardando}>{guardando ? 'Agregando…' : 'Agregar bloqueo'}</button>
      </form>

      {bloqueos.length === 0 ? (
        <p className="texto-muted">No hay bloqueos cargados (vacaciones, feriados, etc.).</p>
      ) : (
        <table className="tabla-simple">
          <thead><tr><th>Desde</th><th>Hasta</th><th>Motivo</th><th></th></tr></thead>
          <tbody>
            {bloqueos.map((b) => (
              <tr key={b.id}>
                <td>{new Date(b.fechaInicio).toLocaleDateString('es-CL', { timeZone: 'UTC' })}</td>
                <td>{new Date(b.fechaFin).toLocaleDateString('es-CL', { timeZone: 'UTC' })}</td>
                <td>{b.motivo || '—'}</td>
                <td className="acciones">
                  <button className="btn-link btn-danger" onClick={() => manejarEliminar(b.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}