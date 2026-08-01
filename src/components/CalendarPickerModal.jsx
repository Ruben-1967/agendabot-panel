import React, { useState, useEffect } from 'react';
import './CalendarPickerModal.css';

export default function CalendarPickerModal({
  recursoId,
  isOpen,
  onClose,
  onConfirm,
  token,
}) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedHour, setSelectedHour] = useState(null);
  const [selectedProfesional, setSelectedProfesional] = useState(null);

  // Cargar slots al abrir
  useEffect(() => {
    if (isOpen && recursoId) {
      cargarSlots();
    }
  }, [isOpen, recursoId]);

  const cargarSlots = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `https://agendabot-backend-bbw5.onrender.com/disponibilidad/${recursoId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error('Error cargando disponibilidad');
      const data = await res.json();
      setSlots(data.slots || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedDate || !selectedHour) {
      alert('Selecciona fecha y hora');
      return;
    }

    // Validar que el slot siga disponible
    try {
      const res = await fetch(
        `https://agendabot-backend-bbw5.onrender.com/disponibilidad/${recursoId}/validar`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fecha: selectedDate,
            hora: selectedHour,
            profesionalId: selectedProfesional,
          }),
        }
      );

      if (!res.ok) throw new Error('Error validando slot');
      const data = await res.json();

      if (!data.valido) {
        alert('Este horario ya no está disponible');
        return;
      }

      // Confirmar
      onConfirm({
        fecha: selectedDate,
        hora: selectedHour,
        profesionalId: selectedProfesional,
      });

      cerrar();
    } catch (err) {
      setError(err.message);
    }
  };

  const cerrar = () => {
    setSelectedDate(null);
    setSelectedHour(null);
    setSelectedProfesional(null);
    onClose();
  };

  if (!isOpen) return null;

  // Agrupar slots por fecha
  const slotsPorFecha = {};
  slots.forEach((slot) => {
    if (!slotsPorFecha[slot.fecha]) {
      slotsPorFecha[slot.fecha] = [];
    }
    slotsPorFecha[slot.fecha].push(slot);
  });

  const fechasDisponibles = Object.keys(slotsPorFecha).sort();
  const horariosDelDia = selectedDate ? slotsPorFecha[selectedDate] || [] : [];

  return (
    <div className="calendar-picker-overlay">
      <div className="calendar-picker-modal">
        <div className="calendar-picker-header">
          <h2>Seleccionar fecha y hora</h2>
          <button className="close-btn" onClick={cerrar}>✕</button>
        </div>

        {loading && <div className="loading">Cargando disponibilidad...</div>}

        {error && (
          <div className="error-box">
            <p>{error}</p>
            <button onClick={cargarSlots}>Reintentar</button>
          </div>
        )}

        {!loading && !error && (
          <div className="calendar-picker-body">
            {/* COLUMNA 1: Fechas */}
            <div className="fechas-column">
              <h3>Fechas disponibles</h3>
              <div className="fechas-list">
                {fechasDisponibles.length === 0 ? (
                  <p className="empty">No hay disponibilidad</p>
                ) : (
                  fechasDisponibles.map((fecha) => {
                    const fechaObj = new Date(fecha + 'T00:00:00');
                    const diaNombre = [
                      'Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb',
                    ][fechaObj.getDay()];
                    const dia = fechaObj.getDate();
                    const mes = [
                      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
                    ][fechaObj.getMonth()];

                    return (
                      <button
                        key={fecha}
                        className={`fecha-btn ${selectedDate === fecha ? 'activo' : ''}`}
                        onClick={() => setSelectedDate(fecha)}
                      >
                        <div className="fecha-dia">{diaNombre}</div>
                        <div className="fecha-num">{dia}</div>
                        <div className="fecha-mes">{mes}</div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* COLUMNA 2: Horarios */}
            <div className="horarios-column">
              <h3>
                {selectedDate
                  ? `Horarios disponibles`
                  : 'Elige una fecha'}
              </h3>
              {selectedDate && (
                <div className="horarios-list">
                  {horariosDelDia.length === 0 ? (
                    <p className="empty">Sin disponibilidad este día</p>
                  ) : (
                    horariosDelDia.map((slot) => (
                      <button
                        key={`${slot.fecha}-${slot.hora}`}
                        className={`hora-btn ${
                          selectedHour === slot.hora ? 'activo' : ''
                        }`}
                        onClick={() => {
                          setSelectedHour(slot.hora);
                          // Si hay solo un profesional disponible, seleccionarlo automáticamente
                          if (slot.disponiblePara.length === 1) {
                            setSelectedProfesional(slot.disponiblePara[0]);
                          }
                        }}
                      >
                        {slot.hora}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* BOTONES */}
        <div className="calendar-picker-footer">
          <button className="btn-cancel" onClick={cerrar}>
            Cancelar
          </button>
          <button
            className="btn-confirm"
            onClick={handleConfirm}
            disabled={!selectedDate || !selectedHour || loading}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}