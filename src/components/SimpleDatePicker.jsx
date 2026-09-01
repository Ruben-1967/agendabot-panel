import { useEffect, useRef, useState } from 'react';
import './SimpleDatePicker.css';

// Selector de calendario genérico (sin depender de disponibilidad de citas
// ni de ningún endpoint) — reemplaza <input type="date"> nativo donde
// escribir a mano es incómodo: los inputs de fecha nativos en Windows/Chrome
// avanzan de segmento (día/mes/año) con cada tecla si se escribe más lento
// de lo que el navegador espera, dejando "pegado" solo el último dígito —
// no es un bug de este código, es así como funciona el widget nativo del
// sistema operativo. Un calendario clickeable evita el problema del todo.
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_SEMANA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function formatearFechaCorta(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MESES[m - 1].slice(0, 3)} ${y}`;
}

export default function SimpleDatePicker({ value, onChange, placeholder = 'Elegir fecha' }) {
  const [abierto, setAbierto] = useState(false);
  const [mesVisible, setMesVisible] = useState(() => {
    if (value) {
      const [anio, mes] = value.split('-').map(Number);
      return { anio, mes: mes - 1 };
    }
    const hoy = new Date();
    return { anio: hoy.getFullYear(), mes: hoy.getMonth() };
  });
  const contenedorRef = useRef(null);

  useEffect(() => {
    function alClickFuera(e) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) {
        setAbierto(false);
      }
    }
    document.addEventListener('mousedown', alClickFuera);
    return () => document.removeEventListener('mousedown', alClickFuera);
  }, []);

  function cambiarMes(delta) {
    setMesVisible((prev) => {
      let mes = prev.mes + delta;
      let anio = prev.anio;
      if (mes < 0) { mes = 11; anio -= 1; }
      if (mes > 11) { mes = 0; anio += 1; }
      return { anio, mes };
    });
  }

  function elegirDia(dia) {
    const iso = `${mesVisible.anio}-${String(mesVisible.mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    onChange(iso);
    setAbierto(false);
  }

  const primerDiaSemana = new Date(mesVisible.anio, mesVisible.mes, 1).getDay();
  const diasEnMes = new Date(mesVisible.anio, mesVisible.mes + 1, 0).getDate();
  const celdas = [
    ...Array.from({ length: primerDiaSemana }, () => null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ];

  return (
    <div className="simple-date-picker" ref={contenedorRef}>
      <button type="button" className="simple-date-picker-boton" onClick={() => setAbierto((a) => !a)}>
        {value ? formatearFechaCorta(value) : placeholder}
      </button>

      {abierto && (
        <div className="simple-date-picker-popover">
          <div className="simple-date-picker-header">
            <button type="button" onClick={() => cambiarMes(-1)} aria-label="Mes anterior">‹</button>
            <span>{MESES[mesVisible.mes]} {mesVisible.anio}</span>
            <button type="button" onClick={() => cambiarMes(1)} aria-label="Mes siguiente">›</button>
          </div>
          <div className="simple-date-picker-dias-semana">
            {DIAS_SEMANA.map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div className="simple-date-picker-grid">
            {celdas.map((dia, i) => {
              if (dia === null) return <span key={`vacio-${i}`} />;
              const iso = `${mesVisible.anio}-${String(mesVisible.mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
              return (
                <button
                  type="button"
                  key={dia}
                  className={`simple-date-picker-dia ${iso === value ? 'activo' : ''}`}
                  onClick={() => elegirDia(dia)}
                >
                  {dia}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
