import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_URL, fetchPlantillasRapidas, crearPlantillaRapida, eliminarPlantillaRapida } from '../../api/client';
import './ChatsEnVivo.css';

const MS_ENTRE_POLLS_CHATS = 15_000;
const CLAVE_VISTOS = 'agendabot_chats_vistos';
const CLAVE_SILENCIADO = 'agendabot_chats_silenciado';

// "No leído" = el último mensaje es del cliente y no lo hemos "visto" (abierto
// esa conversación) todavía en este navegador — no hay un campo de leído/no
// leído en la base de datos, así que se rastrea localmente por admin.
function leerVistos() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_VISTOS) || '{}');
  } catch {
    return {};
  }
}

function marcarVisto(conversacionId, timestamp) {
  try {
    const vistos = leerVistos();
    vistos[conversacionId] = timestamp;
    localStorage.setItem(CLAVE_VISTOS, JSON.stringify(vistos));
  } catch {
    // localStorage puede fallar (modo privado, etc.) — no es crítico
  }
}

function esNoLeido(conv, vistos) {
  if (conv.esEjemplo || conv.ultimoMensajeRol !== 'usuario' || !conv.ultimoMensajeTimestamp) return false;
  const visto = vistos[conv.id];
  return !visto || new Date(visto) < new Date(conv.ultimoMensajeTimestamp);
}

// Beep corto generado con Web Audio API — sin depender de ningún archivo de
// audio externo.
function reproducirBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
    osc.onended = () => ctx.close();
  } catch {
    // Web Audio no disponible — silencioso, no es crítico
  }
}

export default function ChatsEnVivo() {
  const { usuario, token } = useAuth();
  const navigate = useNavigate();
  const [conversaciones, setConversaciones] = useState([]);
  const [conversacionSeleccionada, setConversacionSeleccionada] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [filtroCanal, setFiltroCanal] = useState('todos');
  const [silenciado, setSilenciado] = useState(() => localStorage.getItem(CLAVE_SILENCIADO) === '1');
  const [vistos, setVistos] = useState(leerVistos);

  const [plantillas, setPlantillas] = useState([]);
  const [mostrarPlantillas, setMostrarPlantillas] = useState(false);
  const [nuevaPlantillaTexto, setNuevaPlantillaTexto] = useState('');
  const [guardandoPlantilla, setGuardandoPlantilla] = useState(false);

  // Guarda el timestamp del último mensaje visto de cada conversación en el
  // poll anterior, para detectar SOLO mensajes nuevos (no repetir el sonido
  // en cada poll ni al cargar la página la primera vez).
  const ultimosTimestampsRef = useRef(null);

  useEffect(() => {
    if (token) {
      cargarConversaciones({ esPrimeraCarga: true });
      fetchPlantillasRapidas(token).then(setPlantillas).catch(() => {});
      const intervalo = setInterval(() => cargarConversaciones({ esPrimeraCarga: false }), MS_ENTRE_POLLS_CHATS);
      return () => clearInterval(intervalo);
    }
  }, [token]);

  function alternarSilencio() {
    setSilenciado((prev) => {
      const nuevo = !prev;
      try {
        localStorage.setItem(CLAVE_SILENCIADO, nuevo ? '1' : '0');
      } catch {
        // no crítico
      }
      return nuevo;
    });
  }

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

  const cargarConversaciones = async ({ esPrimeraCarga } = {}) => {
    try {
      if (esPrimeraCarga) setLoading(true);
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
      const listaNueva = data.conversaciones || [];

      // Alerta sonora: solo para mensajes nuevos del cliente detectados
      // DESPUÉS de la primera carga (evita sonar al abrir la pantalla con
      // chats ya pendientes) y solo si no está silenciado.
      if (!esPrimeraCarga && ultimosTimestampsRef.current) {
        const huboMensajeNuevo = listaNueva.some((conv) => {
          if (conv.esEjemplo || conv.ultimoMensajeRol !== 'usuario') return false;
          const anterior = ultimosTimestampsRef.current[conv.id];
          return anterior === undefined || new Date(conv.ultimoMensajeTimestamp) > new Date(anterior);
        });
        if (huboMensajeNuevo && !silenciado) {
          reproducirBeep();
        }
      }

      ultimosTimestampsRef.current = Object.fromEntries(
        listaNueva.map((conv) => [conv.id, conv.ultimoMensajeTimestamp])
      );

      setConversaciones(listaNueva);
    } catch (err) {
      setError(err.message);
    } finally {
      if (esPrimeraCarga) setLoading(false);
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

      const mensajesLista = Array.isArray(data.conversacion?.mensajes) ? data.conversacion.mensajes : [];
      const ultimoTimestamp = mensajesLista[mensajesLista.length - 1]?.timestamp;
      if (ultimoTimestamp) {
        marcarVisto(conversacionId, ultimoTimestamp);
        setVistos(leerVistos());
      }
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

  const conversacionesFiltradas = conversaciones.filter(
    (conv) => filtroCanal === 'todos' || conv.canal === filtroCanal
  );
  const totalWhatsapp = conversaciones.filter((c) => c.canal === 'whatsapp').length;
  const totalInstagram = conversaciones.filter((c) => c.canal === 'instagram').length;

  return (
    <div className="chats-container">
      <div className="chats-header">
        <div className="chats-header-fila">
          <div>
            <h1>Chats en vivo</h1>
            <p className="fecha">{obtenerFecha()}</p>
          </div>
          <button
            type="button"
            className="btn-silenciar"
            onClick={alternarSilencio}
            title={silenciado ? 'Activar alerta sonora' : 'Silenciar alerta sonora'}
          >
            {silenciado ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      <div className="chats-tabs">
        <button
          type="button"
          className={`chat-tab ${filtroCanal === 'todos' ? 'activo' : ''}`}
          onClick={() => setFiltroCanal('todos')}
        >
          Todos <span className="tab-count">{conversaciones.length}</span>
        </button>
        <button
          type="button"
          className={`chat-tab ${filtroCanal === 'whatsapp' ? 'activo' : ''}`}
          onClick={() => setFiltroCanal('whatsapp')}
        >
          WhatsApp <span className="tab-count">{totalWhatsapp}</span>
        </button>
        <button
          type="button"
          className={`chat-tab ${filtroCanal === 'instagram' ? 'activo' : ''}`}
          onClick={() => setFiltroCanal('instagram')}
        >
          Instagram <span className="tab-count">{totalInstagram}</span>
        </button>
      </div>

      <div className="chats-split">
        <div className="chats-lista">
          {conversacionesFiltradas.length === 0 ? (
            <div className="empty-state">No hay chats</div>
          ) : (
            conversacionesFiltradas.map((conv) => {
              const noLeido = esNoLeido(conv, vistos);
              return (
                <div
                  key={conv.id}
                  className={`chat-item ${conversacionSeleccionada?.id === conv.id ? 'activo' : ''} ${noLeido ? 'no-leido' : ''}`}
                  onClick={() => cargarConversacion(conv.id)}
                >
                  <div className="chat-item-header">
                    <div className="chat-nombre">
                      {noLeido && <span className="punto-no-leido" title="No leído" />}
                      {conv.clienteNombre}
                      {conv.esEjemplo && <span className="badge-ejemplo">Ejemplo</span>}
                      {conv.canal === 'instagram' && <span className="badge-canal-instagram">Instagram</span>}
                    </div>
                    <div className="chat-hora">
                      {formatearHora(conv.ultimoMensajeTimestamp)}
                    </div>
                  </div>
                  <div className="chat-preview">{conv.ultimoMensaje}</div>
                </div>
              );
            })
          )}
        </div>

        <div className="chat-expandido">
          {conversacionSeleccionada ? (
            <>
              <div className="chat-expandido-header">
                <h2>{conversacionSeleccionada.clienteNombre}</h2>
                {conversacionSeleccionada.canal === 'instagram' && (
                  <span className="badge-canal-instagram">Instagram</span>
                )}
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