import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_URL, fetchProfesionales, fetchDisponibilidadRecurso } from '../../api/client';
import SimpleDatePicker from '../../components/SimpleDatePicker';
import './ListaEspera.css';

function fechaHoyLocal() {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

export default function ListaEspera() {
  const { usuario, token } = useAuth();
  const [listaEspera, setListaEspera] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [filtroServicio, setFiltroServicio] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accionando, setAccionando] = useState(false);

  const [profesionales, setProfesionales] = useState([]);

  // Modal de "Agendar" — mismo patrón que "Reagendar" en Tabla de citas:
  // SimpleDatePicker + horas reales del motor de disponibilidad (ver
  // GET /agenda/disponibilidad/:recursoId). El modal anterior
  // (CalendarPickerModal + /disponibilidad/:recursoId) dependía de un
  // servicio roto contra el schema actual — ver git log de este archivo.
  const [pacienteAgendar, setPacienteAgendar] = useState(null);
  const [agendarRecursoId, setAgendarRecursoId] = useState('');
  const [agendarFecha, setAgendarFecha] = useState('');
  const [agendarHoras, setAgendarHoras] = useState([]);
  const [agendarHoraSeleccionada, setAgendarHoraSeleccionada] = useState('');
  const [cargandoHorasAgendar, setCargandoHorasAgendar] = useState(false);
  const [errorAgendar, setErrorAgendar] = useState(null);

  useEffect(() => {
    if (token) {
      cargarListaEspera();
      fetchProfesionales(token).then((data) => setProfesionales(data.profesionales || [])).catch(() => {});
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

  const handleAgendar = (listaEsperaItem) => {
    setPacienteAgendar(listaEsperaItem);
    setAgendarRecursoId(listaEsperaItem.preferenciaRecursoId || profesionales[0]?.id || '');
    setAgendarFecha(fechaHoyLocal());
    setAgendarHoraSeleccionada('');
    setErrorAgendar(null);
  };

  const cerrarModalAgendar = () => {
    setPacienteAgendar(null);
    setAgendarHoras([]);
  };

  useEffect(() => {
    if (!pacienteAgendar || !agendarRecursoId || !agendarFecha || !token) return;
    setCargandoHorasAgendar(true);
    setAgendarHoraSeleccionada('');
    fetchDisponibilidadRecurso(token, agendarRecursoId, agendarFecha)
      .then((data) => setAgendarHoras(data.horas || []))
      .catch((err) => setErrorAgendar(err.message))
      .finally(() => setCargandoHorasAgendar(false));
  }, [pacienteAgendar, agendarRecursoId, agendarFecha, token]);

  const confirmarAgendamiento = async () => {
    if (!pacienteAgendar || !agendarHoraSeleccionada) return;

    setAccionando(true);
    setErrorAgendar(null);
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
            fecha: agendarFecha,
            hora: agendarHoraSeleccionada,
            recursoAgendableId: agendarRecursoId,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error agendando paciente');
      }
      await cargarListaEspera();
      cerrarModalAgendar();
      alert('Paciente agendado correctamente');
    } catch (err) {
      setErrorAgendar(err.message);
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

      {pacienteAgendar && (
        <div className="agendar-overlay" onClick={cerrarModalAgendar}>
          <div className="agendar-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Agendar a {pacienteAgendar.clienteNombre}</h3>

            {profesionales.length > 1 && (
              <label className="agendar-campo">
                Profesional
                <select value={agendarRecursoId} onChange={(e) => setAgendarRecursoId(e.target.value)}>
                  {profesionales.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </label>
            )}

            <SimpleDatePicker value={agendarFecha} onChange={setAgendarFecha} />

            {cargandoHorasAgendar ? (
              <p className="agendar-estado">Cargando horas disponibles…</p>
            ) : agendarHoras.length === 0 ? (
              <p className="agendar-estado">Sin horas disponibles ese día.</p>
            ) : (
              <div className="agendar-horas">
                {agendarHoras.map((h) => (
                  <button
                    key={h}
                    className={`agendar-pill ${agendarHoraSeleccionada === h ? 'activo' : ''}`}
                    onClick={() => setAgendarHoraSeleccionada(h)}
                  >
                    {h}
                  </button>
                ))}
              </div>
            )}

            {errorAgendar && <p className="agendar-error">{errorAgendar}</p>}

            <div className="agendar-acciones">
              <button className="btn-cancelar" onClick={cerrarModalAgendar}>Cancelar</button>
              <button
                className="btn-agendar"
                disabled={!agendarHoraSeleccionada || accionando}
                onClick={confirmarAgendamiento}
              >
                {accionando ? 'Agendando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}