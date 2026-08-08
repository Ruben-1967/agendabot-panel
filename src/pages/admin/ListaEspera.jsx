import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import CalendarPickerModal from '../../components/CalendarPickerModal';
import { API_URL } from '../../api/client';
import './ListaEspera.css';

export default function ListaEspera() {
  const { usuario, token } = useAuth();
  const [listaEspera, setListaEspera] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [filtroServicio, setFiltroServicio] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accionando, setAccionando] = useState(false);

  // NUEVO: States para CalendarPickerModal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [pacienteAgendar, setPacienteAgendar] = useState(null);

  useEffect(() => {
    if (token) {
      cargarListaEspera();
    }
  }, [token]);

  const cargarListaEspera = async () => {
    try {
      setLoading(true);
      const empresaId = usuario?.empresaId;
      if (!empresaId) {
        throw new Error('No hay empresaId en la sesión');
      }
      const res = await fetch(
        `${API_URL}/lista-espera/${empresaId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error('Error al cargar lista de espera');
      const data = await res.json();
      setListaEspera(data.listaEspera || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filtrada = listaEspera.filter((item) => {
    if (filtroServicio === 'todos') return true;
    return item.preferenciaRecursoId === filtroServicio;
  });

  // MODIFICADO: Abre el modal en lugar de agendar directo
  const handleAgendar = async (listaEsperaItem) => {
    setPacienteAgendar(listaEsperaItem);
    setModalAbierto(true);
  };

  // NUEVO: Confirma el agendamiento desde el modal
  const handleConfirmarAgendamiento = async (selection) => {
    if (!pacienteAgendar) return;

    setAccionando(true);
    try {
      const res = await fetch(
        `${API_URL}/lista-espera/${pacienteAgendar.id}/agendar`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fecha: selection.fecha,
            hora: selection.hora,
            profesionalId: selection.profesionalId,
          }),
        }
      );

      if (!res.ok) throw new Error('Error agendando paciente');
      await cargarListaEspera();
      setPacienteAgendar(null);
      setModalAbierto(false);
      alert('Paciente agendado correctamente');
    } catch (err) {
      alert(err.message);
    } finally {
      setAccionando(false);
    }
  };

  const handleCancelar = async (id) => {
    if (!window.confirm('¿Cancelar este paciente de la lista de espera?')) return;
    setAccionando(true);
    try {
      const res = await fetch(
        `${API_URL}/lista-espera/${id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error('Error cancelando');
      await cargarListaEspera();
    } catch (err) {
      alert(err.message);
    } finally {
      setAccionando(false);
    }
  };

  const obtenerFecha = () => {
    const hoy = new Date();
    const diasSemana = [
      'domingo',
      'lunes',
      'martes',
      'miercoles',
      'jueves',
      'viernes',
      'sabado',
    ];
    const meses = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    const diaSemana = diasSemana[hoy.getDay()];
    const dia = hoy.getDate();
    const mes = meses[hoy.getMonth()];
    return `${diaSemana} ${dia} de ${mes}`;
  };

  if (loading) {
    return (
      <div className="lista-espera-container">
        <div className="lista-header">
          <h1>Lista de espera</h1>
          <p className="fecha">{obtenerFecha()}</p>
        </div>
        <div className="loading">Cargando lista de espera...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lista-espera-container">
        <div className="lista-header">
          <h1>Lista de espera</h1>
          <p className="fecha">{obtenerFecha()}</p>
        </div>
        <div className="error-box">
          <p>{error}</p>
          <button onClick={cargarListaEspera}>Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="lista-espera-container">
      <div className="lista-header">
        <h1>Lista de espera</h1>
        <p className="fecha">{obtenerFecha()}</p>
      </div>

      <div className="lista-tabla">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Preferencia</th>
              <th>Estado</th>
              <th>Agregado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrada.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-row">
                  No hay pacientes en lista de espera
                </td>
              </tr>
            ) : (
              filtrada.map((item) => (
                <tr key={item.id}>
                  <td className="cliente-nombre">
                    <strong>{item.clienteNombre}</strong>
                    <div className="cliente-telefono">{item.clienteTelefono}</div>
                  </td>
                  <td>{item.preferenciaFranja || 'Cualquier horario'}</td>
                  <td>
                    <span className={`estado-badge ${item.estado.toLowerCase()}`}>
                      {item.estado}
                    </span>
                  </td>
                  <td>{item.agregadoEn}</td>
                  <td className="acciones-cell">
                    {item.estado === 'ESPERANDO' && (
                      <>
                        <button
                          className="btn-agendar"
                          onClick={() => handleAgendar(item)}
                          disabled={accionando}
                        >
                          Agendar
                        </button>
                        <button
                          className="btn-cancelar"
                          onClick={() => handleCancelar(item.id)}
                          disabled={accionando}
                        >
                          Cancelar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* NUEVO: CalendarPickerModal */}
      <CalendarPickerModal
        isOpen={modalAbierto}
        onClose={() => {
          setModalAbierto(false);
          setPacienteAgendar(null);
        }}
        onConfirm={handleConfirmarAgendamiento}
        recursoId={pacienteAgendar?.preferenciaRecursoId}
        token={token}
      />
    </div>
  );
}