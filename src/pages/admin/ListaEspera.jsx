import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './ListaEspera.css';

export default function ListaEspera() {
  const { usuario, token } = useAuth();
  const [listaEspera, setListaEspera] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [filtroServicio, setFiltroServicio] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accionando, setAccionando] = useState(false);

  useEffect(() => {
    if (token) {
      cargarListaEspera();
      // cargarServicios(); // TODO: implementar después
    }
  }, [token]);

  const cargarListaEspera = async () => {
    try {
      setLoading(true);
      const empresaId = usuario?.empresaId;
      if (!empresaId) {
        throw new Error('No hay empresaId en la sesión');
      }

      const res = await fetch(`https://agendabot-backend-bbw5.onrender.com/lista-espera/${empresaId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Error al cargar lista de espera');
      const data = await res.json();
      setListaEspera(data.listaEspera || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarServicios = async () => {
    try {
      const empresaId = usuario?.empresaId;
      const res = await fetch(`https://agendabot-backend-bbw5.onrender.com/servicios/${empresaId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setServicios(data || []);
      }
    } catch (err) {
      console.error('Error cargando servicios:', err);
    }
  };

  const obtenerFecha = () => {
    const hoy = new Date();
    const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const diaSemana = diasSemana[hoy.getDay()];
    const dia = hoy.getDate();
    const mes = meses[hoy.getMonth()];
    return `${diaSemana} ${dia} de ${mes}`;
  };

  const calcularDiasEsperando = (fechaCreacion) => {
    const hoy = new Date();
    const creacion = new Date(fechaCreacion);
    const diffMs = hoy - creacion;
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDias;
  };

  const clientesFiltrados = listaEspera.filter((cliente) => {
    if (filtroServicio === 'todos') return true;
    // Aquí se compararía con el servicio, pero por ahora usa preferencia
    return true;
  });

  const handleAgendar = async (listaEsperaId, clienteNombre) => {
    // Abre modal o redirige a AgendaDia con cliente preseleccionado
    console.log('Agendar:', clienteNombre);
    // Por ahora solo log, implementar después
  };

  const handleContactar = async (telefono, clienteNombre) => {
    // Abre WhatsApp
    window.open(`https://wa.me/${telefono.replace(/\D/g, '')}?text=Hola%20${clienteNombre}%20te%20contactamos%20de%20Ahorróptica`, '_blank');
  };

  const handleRemover = async (listaEsperaId) => {
    if (!window.confirm('¿Remover cliente de la lista de espera?')) return;

    setAccionando(true);
    try {
      const res = await fetch(`https://agendabot-backend-bbw5.onrender.com/lista-espera/${listaEsperaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        cargarListaEspera();
      } else {
        alert('Error al remover cliente');
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setAccionando(false);
    }
  };

  if (loading) {
    return (
      <div className="lista-espera-container">
        <div className="lista-header">
          <h1>Lista de espera</h1>
          <p className="fecha">{obtenerFecha()}</p>
        </div>
        <div className="lista-loading">
          <div className="shimmer"></div>
          <div className="shimmer"></div>
          <div className="shimmer"></div>
        </div>
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

      <div className="filtros">
        <button
          className={`filtro-btn ${filtroServicio === 'todos' ? 'activo' : ''}`}
          onClick={() => setFiltroServicio('todos')}
        >
          todos
        </button>
        {servicios.map((servicio) => (
          <button
            key={servicio.id}
            className={`filtro-btn ${filtroServicio === servicio.id ? 'activo' : ''}`}
            onClick={() => setFiltroServicio(servicio.id)}
          >
            {servicio.nombre}
          </button>
        ))}
      </div>

      <div className="lista-clientes">
        {clientesFiltrados.length === 0 ? (
          <div className="empty-state">
            <p>No hay clientes en lista de espera</p>
          </div>
        ) : (
          clientesFiltrados.map((cliente, index) => {
            const diasEsperando = calcularDiasEsperando(cliente.creadoEn);
            return (
              <div key={cliente.id} className="cliente-card">
                <div className="cliente-numero">{index + 1}</div>
                <div className="cliente-info">
                  <div className="cliente-nombre">{cliente.cliente.nombre}</div>
                  <div className="cliente-dias">
                    {diasEsperando} {diasEsperando === 1 ? 'día' : 'días'} esperando
                  </div>
                  <div className="cliente-detalle">Preferencia: {cliente.preferenciaFranja || 'Cualquier día'}</div>
                  <div className="cliente-telefono">📞 {cliente.cliente.telefono || '—'}</div>
                </div>
                <div className="cliente-acciones">
                  <button
                    className="btn btn-agendar"
                    onClick={() => handleAgendar(cliente.id, cliente.cliente.nombre)}
                    disabled={accionando}
                  >
                    agendar
                  </button>
                  <button
                    className="btn btn-contactar"
                    onClick={() => handleContactar(cliente.cliente.telefono, cliente.cliente.nombre)}
                    disabled={accionando}
                  >
                    contactar
                  </button>
                  <button
                    className="btn btn-remover"
                    onClick={() => handleRemover(cliente.id)}
                    disabled={accionando}
                  >
                    remover
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
