import { useState } from 'react';
import { guardarHorarioModalidad } from '../api/client';

const NOMBRES_DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/**
 * No existe todavía un GET que devuelva el horario de modalidad ya guardado
 * de un vendedor, así que la grilla siempre parte en blanco: cada Guardar
 * reemplaza por completo lo que haya en el backend con lo que se ve acá.
 */
export default function EditorHorarioModalidad({ vendedorId, token, setError }) {
  const [modalidadPorDia, setModalidadPorDia] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  function actualizarDia(dia, valor) {
    setGuardado(false);
    setModalidadPorDia((prev) => {
      const siguiente = { ...prev };
      if (valor) {
        siguiente[dia] = valor;
      } else {
        delete siguiente[dia];
      }
      return siguiente;
    });
  }

  async function manejarGuardar() {
    setGuardando(true);
    setGuardado(false);
    setError('');
    try {
      const dias = Object.entries(modalidadPorDia).map(([diaSemana, modalidad]) => ({
        diaSemana: Number(diaSemana),
        modalidad,
      }));
      await guardarHorarioModalidad(token, vendedorId, dias);
      setGuardado(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <p className="texto-ayuda" style={{ marginBottom: 14 }}>
        Esta grilla siempre parte vacía: no se puede leer el horario guardado previamente, solo
        reemplazarlo. Define los días que correspondan y guarda.
      </p>
      {NOMBRES_DIAS.map((nombreDia, dia) => (
        <div key={dia} className="fila-horario-dia">
          <div className="fila-horario-dia-nombre">{nombreDia}</div>
          <div className="fila-horario-dia-bloques">
            <select
              value={modalidadPorDia[dia] || ''}
              onChange={(e) => actualizarDia(dia, e.target.value)}
            >
              <option value="">Sin definir</option>
              <option value="presencial">Presencial</option>
              <option value="teletrabajo">Teletrabajo</option>
            </select>
          </div>
        </div>
      ))}
      <button type="button" onClick={manejarGuardar} disabled={guardando} style={{ marginTop: 14 }}>
        {guardando ? 'Guardando…' : 'Guardar horario de modalidad'}
      </button>
      {guardado && <p className="aviso-guardado">Horario de modalidad guardado.</p>}
    </div>
  );
}
