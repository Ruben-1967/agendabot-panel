import { useEffect, useState } from 'react';
import { guardarHorarios } from '../api/client';

const NOMBRES_DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function generarClave() {
  return Math.random().toString(36).slice(2);
}

/**
 * Editor de horario semanal, reutilizable para el recurso único de una
 * empresa (ConfiguracionAgenda.jsx, sin recursoId) o para un profesional
 * puntual dentro de una empresa multi-profesional (GestionProfesionales.jsx,
 * con recursoId).
 */
export default function EditorHorario({ horarios, recursoId, token, onGuardado, setError }) {
  const [bloques, setBloques] = useState(
    horarios.map((h) => ({ clave: h.id, diaSemana: h.diaSemana, horaInicio: h.horaInicio, horaFin: h.horaFin }))
  );
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setBloques(horarios.map((h) => ({ clave: h.id, diaSemana: h.diaSemana, horaInicio: h.horaInicio, horaFin: h.horaFin })));
  }, [horarios]);

  function agregarBloque(dia) {
    setBloques((prev) => [...prev, { clave: generarClave(), diaSemana: dia, horaInicio: '09:00', horaFin: '13:00' }]);
  }
  function actualizarBloque(clave, campo, valor) {
    setBloques((prev) => prev.map((b) => (b.clave === clave ? { ...b, [campo]: valor } : b)));
  }
  function eliminarBloqueLocal(clave) {
    setBloques((prev) => prev.filter((b) => b.clave !== clave));
  }

  async function manejarGuardar() {
    setGuardando(true);
    setError('');
    try {
      await guardarHorarios(
        token,
        bloques.map(({ diaSemana, horaInicio, horaFin }) => ({ diaSemana, horaInicio, horaFin })),
        recursoId
      );
      await onGuardado();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      {NOMBRES_DIAS.map((nombreDia, dia) => {
        const bloquesDia = bloques.filter((b) => b.diaSemana === dia);
        return (
          <div key={dia} className="fila-horario-dia">
            <div className="fila-horario-dia-nombre">{nombreDia}</div>
            <div className="fila-horario-dia-bloques">
              {bloquesDia.length === 0 && <span className="texto-muted">Cerrado</span>}
              {bloquesDia.map((b) => (
                <div key={b.clave} className="bloque-horario">
                  <input
                    type="time"
                    value={b.horaInicio}
                    onChange={(e) => actualizarBloque(b.clave, 'horaInicio', e.target.value)}
                  />
                  <span>a</span>
                  <input
                    type="time"
                    value={b.horaFin}
                    onChange={(e) => actualizarBloque(b.clave, 'horaFin', e.target.value)}
                  />
                  <button type="button" className="btn-link btn-danger" onClick={() => eliminarBloqueLocal(b.clave)}>Quitar</button>
                </div>
              ))}
              <button type="button" className="btn-link" onClick={() => agregarBloque(dia)}>+ Agregar horario</button>
            </div>
          </div>
        );
      })}
      <button type="button" onClick={manejarGuardar} disabled={guardando} style={{ marginTop: 14 }}>
        {guardando ? 'Guardando…' : 'Guardar horario semanal'}
      </button>
    </div>
  );
}