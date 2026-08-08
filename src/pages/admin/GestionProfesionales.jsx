import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './GestionProfesionales.css';
import { useAuth } from '../../context/AuthContext';
import EditorHorario from '../../components/EditorHorario';
import { fetchProfesionales, crearProfesional } from '../../api/client';

const NOMBRES_DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function resumenHorario(horarios) {
  if (!horarios || horarios.length === 0) return 'Sin horario cargado';
  const dias = [...new Set(horarios.map((h) => h.diaSemana))].sort();
  return dias.map((d) => NOMBRES_DIAS_CORTO[d]).join(', ');
}

function FormNuevoProfesional({ token, onCreado, onUpsell, onCancelar }) {
  const [nombre, setNombre] = useState('');
  const [duracion, setDuracion] = useState(30);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  async function manejarGuardar(e) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setGuardando(true);
    setError('');
    try {
      await crearProfesional(token, {
        nombre: nombre.trim(),
        duracionCitaMinutos: Number(duracion),
      });
      onCreado();
    } catch (err) {
      if (err.message === 'LIMITE_PROFESIONALES_ALCANZADO') {
        onUpsell();
      } else {
        setError(err.message);
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="form-campana" onSubmit={manejarGuardar}>
      {error && <p className="mensaje-error">{error}</p>}
      <label>
        Nombre del profesional
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej. Dra. Camila Reyes"
          required
          autoFocus
        />
      </label>
      <label>
        Duración de cada cita (minutos)
        <input type="number" min="5" value={duracion} onChange={(e) => setDuracion(e.target.value)} required />
      </label>
      <div className="acciones-form-profesional">
        <button type="submit" disabled={guardando}>{guardando ? 'Creando…' : 'Crear profesional'}</button>
        <button type="button" className="btn-link" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  );
}

function TarjetaProfesional({ profesional, token, onCambio, setError, expandido, onToggle }) {
  return (
    <div className="tarjeta-profesional-wrap">
      <div className="tarjeta-profesional" onClick={onToggle} role="button" tabIndex={0}>
        <div className="tarjeta-profesional-info">
          <strong>{profesional.nombre}</strong>
          <span className="texto-muted">{resumenHorario(profesional.horarios)} · {profesional.duracionCitaMinutos} min por cita</span>
        </div>
        <div className="tarjeta-profesional-derecha">
          {profesional.usuarios && profesional.usuarios.length > 0 ? (
            <span className="estado-pill estado-enviado">Con acceso al panel</span>
          ) : (
            <span className="estado-pill estado-ninguno">Sin usuario asignado</span>
          )}
          <span className="btn-link">{expandido ? 'Ocultar horario' : 'Editar horario'}</span>
        </div>
      </div>
      {expandido && (
        <div className="editor-horario-tarjeta">
          <EditorHorario
            horarios={profesional.horarios}
            recursoId={profesional.id}
            token={token}
            onGuardado={onCambio}
            setError={setError}
          />
        </div>
      )}
    </div>
  );
}

export default function GestionProfesionales() {
  const { token } = useAuth();
  const [profesionales, setProfesionales] = useState([]);
  const [limite, setLimite] = useState(null);
  const [puedeAgregarMas, setPuedeAgregarMas] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarUpsell, setMostrarUpsell] = useState(false);
  const [expandidoId, setExpandidoId] = useState(null);

  async function cargar() {
    try {
      const data = await fetchProfesionales(token);
      setProfesionales(data.profesionales);
      setLimite(data.limite);
      setPuedeAgregarMas(data.puedeAgregarMas);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function manejarClickAgregar() {
    setMostrarUpsell(false);
    if (puedeAgregarMas) {
      setMostrarForm(true);
    } else {
      setMostrarUpsell(true);
    }
  }

  function manejarCreado() {
    setMostrarForm(false);
    cargar();
  }

  if (cargando) return <p className="texto-muted">Cargando…</p>;

  const textoLimite = limite === null ? 'ilimitados' : `${profesionales.length} de ${limite}`;

  return (
    <div>
      <h1>Profesionales</h1>
      <p className="pagina-sub">Cada profesional tiene su propia agenda. Los servicios pueden requerir un profesional específico o dejar que el sistema asigne automáticamente al primero disponible.</p>

      {error && <p className="mensaje-error">{error}</p>}

      <div className="barra-limite-profesionales">
        <span className="texto-muted">
          {limite === null ? 'Profesionales: ilimitados en tu plan' : `Profesionales: ${textoLimite} usados`}
        </span>
        {!mostrarForm && (
          <button className="btn-agregar-profesional" onClick={manejarClickAgregar}>+ Agregar profesional</button>
        )}
      </div>

      {mostrarUpsell && (
        <div className="aviso-upsell">
          Tu plan actual permite máximo {limite} profesional{limite === 1 ? '' : 'es'}. <Link to="/suscripcion/elegir-plan" className="link-upsell">Mejora tu plan para agregar más.</Link>
        </div>
      )}

      {mostrarForm && (
        <FormNuevoProfesional
          token={token}
          onCreado={manejarCreado}
          onUpsell={() => { setMostrarForm(false); setMostrarUpsell(true); }}
          onCancelar={() => setMostrarForm(false)}
        />
      )}

      {profesionales.length === 0 ? (
        <p className="texto-muted">Todavía no tienes profesionales cargados.</p>
      ) : (
        <div className="lista-profesionales">
          {profesionales.map((p) => (
            <TarjetaProfesional
              key={p.id}
              profesional={p}
              token={token}
              onCambio={cargar}
              setError={setError}
              expandido={expandidoId === p.id}
              onToggle={() => setExpandidoId(expandidoId === p.id ? null : p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}