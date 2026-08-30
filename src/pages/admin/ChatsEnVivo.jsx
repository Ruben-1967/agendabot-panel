import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../api/client';
import './ChatsEnVivo.css';

export default function ChatsEnVivo() {
  const { usuario, token } = useAuth();
  const [conversaciones, setConversaciones] = useState([]);
  const [conversacionSeleccionada, setConversacionSeleccionada] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (token) {
      cargarConversaciones();
    }
  }, [token]);

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
                    <button className="btn-plantilla">plantilla rapida</button>
                    <button className="btn-agendar">agendar cita</button>
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