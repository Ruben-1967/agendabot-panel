import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_URL, fetchPlantillasRapidas, crearPlantillaRapida, eliminarPlantillaRapida } from '../../api/client';
import './ChatsEnVivo.css';

export default function ChatsEnVivo() {
  const { usuario, token } = useAuth();
  const navigate = useNavigate();
  const [conversaciones, setConversaciones] = useState([]);
  const [conversacionSeleccionada, setConversacionSeleccionada] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  const [plantillas, setPlantillas] = useState([]);
  const [mostrarPlantillas, setMostrarPlantillas] = useState(false);
  const [nuevaPlantillaTexto, setNuevaPlantillaTexto] = useState('');
  const [guardandoPlantilla, setGuardandoPlantilla] = useState(false);

  useEffect(() => {
    if (token) {
      cargarConversaciones();
      fetchPlantillasRapidas(token).then(setPlantillas).catch(() => {});
    }
  }, [token]);

  async function agregarPlantilla(e) {
    e.preventDefault();
    if (!nuevaPlantillaTexto.trim()) return;
    setGuardandoPlantilla(true);
    try {
      const creada = await crearPlantillaRapida(token, nuevaPlantillaTexto.trim());
      setPlantillas((prev) => [...prev, creada]);
      setNuevaPlantillaTexto('');
    } catch (err) {
      console.error('Error creando plantilla rápida:', err);
    } finally {
      setGuardandoPlantilla(false);
    }
  }

  async function borrarPlantilla(id) {
    setPlantillas((prev) => prev.filter((p) => p.id !== id));
    try {
      await eliminarPlantillaRapida(token, id);
    } catch (err) {
      console.error('Error eliminando plantilla rápida:', err);
    }
  }

  function irAAgendarCita() {
    if (!conversacionSeleccionada) return;
    navigate('/admin/tabla-citas', {
      state: {
        clienteId: conversacionSeleccionada.cliente?.id || null,
        clienteNombre: conversacionSeleccionada.clienteNombre,
        telefono: conversacionSeleccionada.telefono,
      },
    });
  }

  const cargarConversaciones = async () => {
    try {
      setLoading(true);
      const empresaId = usuario?.empresaId;
      if (!empresaId) {
        throw new Error('No hay empresaId');
      }

      const res = await fetch(
        `${API_URL}/conversaciones/${empresaId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        throw new Error('Error cargando conversaciones');
      }

      const data = await res.json();
      setConversaciones(data.conversaciones || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarConversacion = async (conversacionId) => {
    try {
      const empresaId = usuario?.empresaId;
      const res = await fetch(
        `${API_URL}/conversaciones/${empresaId}/${conversacionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        throw new Error('Error cargando conversacion');
      }

      const data = await res.json();
      setConversacionSeleccionada(data.conversacion);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleEnviarMensaje = async (e) => {
    e.preventDefault();
    if (!nuevoMensaje.trim() || !conversacionSeleccionada) {
      return;
    }

    setEnviando(true);
    try {
      const empresaId = usuario?.empresaId;
      const res = await fetch(
      `${API_URL}/conversaciones/${empresaId}/${conversacionSeleccionada.id}/mensaje`,

        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ contenido: nuevoMensaje }),
        }
      );

      if (res.ok) {
        setNuevoMensaje('');
        await cargarConversacion(conversacionSeleccionada.id);
        await cargarConversaciones();
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setEnviando(false);
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

  const formatearHora = (timestamp) => {
    if (!timestamp) return '';
    const fecha = new Date(timestamp);
    return fecha.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="chats-container">
        <div className="chats-header">
          <h1>Chats en vivo</h1>
          <p className="fecha">{obtenerFecha()}</p>
        </div>
        <div className="loading">Cargando chats...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chats-container">
        <div className="chats-header">
          <h1>Chats en vivo</h1>
        </div>
        <div className="error-box">
          <p>{error}</p>
          <button onClick={cargarConversaciones}>Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="chats-container">
      <div className="chats-header">
        <h1>Chats en vivo</h1>
        <p className="fecha">{obtenerFecha()}</p>
      </div>

      <div className="chats-split">
        <div className="chats-lista">
          {conversaciones.length === 0 ? (
            <div className="empty-state">No hay chats</div>
          ) : (
            conversaciones.map((conv) => (
              <div
                key={conv.id}
                className={`chat-item ${
                  conversacionSeleccionada?.id === conv.id ? 'activo' : ''
                }`}
                onClick={() => cargarConversacion(conv.id)}
              >
                <div className="chat-item-header">
                  <div className="chat-nombre">
                    {conv.clienteNombre}
                    {conv.esEjemplo && <span className="badge-ejemplo">Ejemplo</span>}
                  </div>
                  <div className="chat-hora">
                    {formatearHora(conv.ultimoMensajeTimestamp)}
                  </div>
                </div>
                <div className="chat-preview">{conv.ultimoMensaje}</div>
              </div>
            ))
          )}
        </div>

        <div className="chat-expandido">
          {conversacionSeleccionada ? (
            <>
              <div className="chat-expandido-header">
                <h2>{conversacionSeleccionada.clienteNombre}</h2>
                {conversacionSeleccionada.esEjemplo ? (
                  <span className="badge-ejemplo">Ejemplo</span>
                ) : (
                  <span className="status-online">● En linea</span>
                )}
              </div>

              <div className="mensajes-container">
                {conversacionSeleccionada.mensajes &&
                  conversacionSeleccionada.mensajes.map((msg, idx) => (
                    <div key={idx} className={`mensaje mensaje-${msg.rol}`}>
                      <div className="mensaje-contenido">{msg.contenido}</div>
                      <div className="mensaje-timestamp">
                        {formatearHora(msg.timestamp)}
                      </div>
                    </div>
                  ))}
              </div>

              {conversacionSeleccionada.esEjemplo ? (
                <div className="aviso-ejemplo">
                  Esta es una conversación de ejemplo — así se vería tu panel con clientes reales escribiéndote.
                </div>
              ) : (
                <>
                  <form onSubmit={handleEnviarMensaje} className="mensaje-input-form">
                    <input
                      type="text"
                      className="mensaje-input"
                      placeholder="Escribe tu respuesta..."
                      value={nuevoMensaje}
                      onChange={(e) => setNuevoMensaje(e.target.value)}
                      disabled={enviando}
                    />
                    <button type="submit" className="btn-enviar" disabled={enviando}>
                      Enviar
                    </button>
                  </form>

                  <div className="mensaje-botones">
                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        className="btn-plantilla"
                        onClick={() => setMostrarPlantillas((v) => !v)}
                      >
                        plantilla rápida
                      </button>
                      {mostrarPlantillas && (
                        <div className="plantillas-dropdown">
                          {plantillas.length === 0 && (
                            <p className="plantillas-vacio">Todavía no tienes plantillas guardadas.</p>
                          )}
                          {plantillas.map((p) => (
                            <div key={p.id} className="plantilla-item">
                              <button
                                type="button"
                                className="plantilla-texto"
                                onClick={() => {
                                  setNuevoMensaje(p.texto);
                                  setMostrarPlantillas(false);
                                }}
                              >
                                {p.texto}
                              </button>
                              <button
                                type="button"
                                className="plantilla-borrar"
                                title="Eliminar"
                                onClick={() => borrarPlantilla(p.id)}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          <form className="plantilla-nueva-form" onSubmit={agregarPlantilla}>
                            <input
                              type="text"
                              placeholder="Nueva plantilla…"
                              value={nuevaPlantillaTexto}
                              onChange={(e) => setNuevaPlantillaTexto(e.target.value)}
                              disabled={guardandoPlantilla}
                            />
                            <button type="submit" disabled={guardandoPlantilla || !nuevaPlantillaTexto.trim()}>
                              +
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                    <button type="button" className="btn-agendar" onClick={irAAgendarCita}>
                      agendar cita
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="chat-vacio">
              <p>Selecciona un chat para comenzar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}