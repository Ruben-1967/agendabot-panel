import { useEffect, useState } from 'react';
import { useVendedorAuth } from '../../../context/VendedorAuthContext';
import { fetchVendedores, crearVendedor, alternarActivoVendedor, resetearPasswordVendedor } from '../../../api/client';
import NavVendedor from '../NavVendedor';
import EditorHorarioModalidad from '../../../components/EditorHorarioModalidad';
import '../vendedor.css';

function formatFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ModalResetPassword({ vendedor, token, onCerrar }) {
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  async function manejarGuardar(e) {
    e.preventDefault();
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirmacion) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      await resetearPasswordVendedor(token, vendedor.id, password);
      setGuardado(true);
    } catch (err) {
      setError(err.message || 'No se pudo resetear la contraseña');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="modal-vendedor-overlay" onClick={onCerrar}>
      <div className="modal-vendedor-caja" onClick={(e) => e.stopPropagation()}>
        <h3>Resetear contraseña</h3>
        <p className="texto-ayuda" style={{ marginBottom: 16 }}>
          Nueva contraseña para <strong>{vendedor.nombre}</strong>. No es posible ver la contraseña actual.
        </p>
        {guardado ? (
          <>
            <p className="aviso-guardado">Contraseña actualizada correctamente.</p>
            <button type="button" className="cta-primaria" onClick={onCerrar}>Cerrar</button>
          </>
        ) : (
          <form onSubmit={manejarGuardar} className="form-vendedor">
            {error && <p className="login-error">{error}</p>}
            <label>
              Contraseña nueva
              <input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
            </label>
            <label>
              Confirmar contraseña
              <input type="password" minLength={6} value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} required />
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="cta-primaria" type="submit" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar contraseña'}
              </button>
              <button type="button" className="cta-secundaria" onClick={onCerrar} disabled={guardando}>Cancelar</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function TarjetaVendedorAdmin({ vendedor: v, token, expandido, onToggle, onToggleActivo, onAbrirReset, procesando, setError }) {
  return (
    <div className="tarjeta-vendedor-admin-wrap">
      <div className="tarjeta-vendedor-admin" onClick={onToggle} role="button" tabIndex={0}>
        <div className="tarjeta-vendedor-admin-info">
          <strong>{v.nombre}</strong>
          <span className="texto-muted">{v.email}</span>
          <span className="texto-muted">{v.telefono || 'Sin teléfono'} · Desde {formatFecha(v.fechaIngreso || v.creadoEn)}</span>
        </div>
        <div className="tarjeta-vendedor-admin-derecha">
          <span className={v.activo ? 'badge-exito' : 'badge-pendiente'}>
            {v.activo ? 'Activo' : 'Bloqueado'}
          </span>
          <span className="btn-link">{expandido ? 'Ocultar' : 'Ver más'}</span>
        </div>
      </div>
      {expandido && (
        <div className="detalle-vendedor-admin">
          <h3 className="subtitulo-tarjeta">Datos</h3>
          <p className="texto-ayuda" style={{ margin: '0 0 4px' }}>Rol: {v.rol}</p>
          <p className="texto-ayuda" style={{ margin: '0 0 4px' }}>Dirección: {v.direccion || '—'}</p>
          <p className="texto-ayuda" style={{ marginBottom: 16 }}>Fecha de ingreso: {formatFecha(v.fechaIngreso)}</p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <button
              type="button"
              className="cta-secundaria"
              onClick={(e) => { e.stopPropagation(); onToggleActivo(v); }}
              disabled={procesando}
            >
              {v.activo ? 'Bloquear' : 'Desbloquear'}
            </button>
            <button
              type="button"
              className="cta-secundaria"
              onClick={(e) => { e.stopPropagation(); onAbrirReset(v); }}
              disabled={procesando}
            >
              Resetear contraseña
            </button>
          </div>

          <h3 className="subtitulo-tarjeta">Horario de modalidad</h3>
          <EditorHorarioModalidad vendedorId={v.id} token={token} setError={setError} />
        </div>
      )}
    </div>
  );
}

export default function AdminVendedores() {
  const { token } = useVendedorAuth();
  const [vendedores, setVendedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [procesandoId, setProcesandoId] = useState(null);
  const [expandidoId, setExpandidoId] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);

  const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [emailNuevo, setEmailNuevo] = useState('');
  const [passwordNuevo, setPasswordNuevo] = useState('');
  const [telefonoNuevo, setTelefonoNuevo] = useState('');
  const [direccionNuevo, setDireccionNuevo] = useState('');
  const [fechaIngresoNuevo, setFechaIngresoNuevo] = useState('');
  const [rolNuevo, setRolNuevo] = useState('VENDEDOR');
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);
  const [errorEmailNuevo, setErrorEmailNuevo] = useState('');

  function cargar() {
    setCargando(true);
    fetchVendedores(token)
      .then((data) => setVendedores(data.vendedores || []))
      .catch((err) => setError(err.message || 'No se pudo cargar el listado'))
      .finally(() => setCargando(false));
  }

  useEffect(() => { cargar(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function manejarCrear(e) {
    e.preventDefault();
    if (!nombreNuevo.trim() || !emailNuevo.trim() || !passwordNuevo) return;

    setGuardandoNuevo(true);
    setError('');
    setErrorEmailNuevo('');
    try {
      await crearVendedor(token, {
        nombre: nombreNuevo.trim(),
        email: emailNuevo.trim(),
        password: passwordNuevo,
        rol: rolNuevo,
        telefono: telefonoNuevo.trim() || undefined,
        direccion: direccionNuevo.trim() || undefined,
        fechaIngreso: fechaIngresoNuevo || undefined,
      });
      setNombreNuevo('');
      setEmailNuevo('');
      setPasswordNuevo('');
      setTelefonoNuevo('');
      setDireccionNuevo('');
      setFechaIngresoNuevo('');
      setRolNuevo('VENDEDOR');
      setMostrarFormNuevo(false);
      cargar();
    } catch (err) {
      if (err.status === 409) {
        setErrorEmailNuevo('Ya existe un vendedor con este email.');
      } else {
        setError(err.message || 'No se pudo crear el vendedor');
      }
    } finally {
      setGuardandoNuevo(false);
    }
  }

  async function manejarToggleActivo(v) {
    const accion = v.activo ? 'bloquear' : 'desbloquear';
    const confirmado = window.confirm(`¿Confirmas que quieres ${accion} a "${v.nombre}"?`);
    if (!confirmado) return;

    setProcesandoId(v.id);
    setError('');
    try {
      const data = await alternarActivoVendedor(token, v.id, !v.activo);
      setVendedores((prev) => prev.map((x) => (x.id === v.id ? data.vendedor : x)));
    } catch (err) {
      setError(err.message || 'No se pudo actualizar el vendedor');
    } finally {
      setProcesandoId(null);
    }
  }

  return (
    <div className="pantalla-vendedor">
      <NavVendedor />
      <div className="vendedor-inner">
        <h1>Vendedores</h1>
        <p className="texto-ayuda">
          Crea cuentas de vendedor, bloquéalas si alguien deja el equipo, resetea contraseñas y define
          su horario semanal de modalidad (presencial/teletrabajo). Bloquear no reasigna los casos
          activos del vendedor — eso queda pendiente aparte.
        </p>

        {error && <p className="login-error">{error}</p>}

        {!mostrarFormNuevo && (
          <button className="cta-secundaria" onClick={() => setMostrarFormNuevo(true)}>+ Nuevo vendedor</button>
        )}

        {mostrarFormNuevo && (
          <form className="form-vendedor" onSubmit={manejarCrear} style={{ marginBottom: 20 }}>
            <label>
              Nombre
              <input value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} required autoFocus />
            </label>
            <label>
              Email
              <input
                type="email"
                value={emailNuevo}
                onChange={(e) => { setEmailNuevo(e.target.value); setErrorEmailNuevo(''); }}
                required
              />
              {errorEmailNuevo && <span style={{ color: 'var(--red)', fontSize: '0.78rem', fontWeight: 500, marginTop: 4, display: 'block' }}>{errorEmailNuevo}</span>}
            </label>
            <label>
              Contraseña
              <input type="password" minLength={6} value={passwordNuevo} onChange={(e) => setPasswordNuevo(e.target.value)} required />
            </label>
            <label>
              Teléfono (opcional)
              <input value={telefonoNuevo} onChange={(e) => setTelefonoNuevo(e.target.value)} />
            </label>
            <label>
              Dirección (opcional)
              <input value={direccionNuevo} onChange={(e) => setDireccionNuevo(e.target.value)} />
            </label>
            <label>
              Fecha de ingreso (opcional)
              <input type="date" value={fechaIngresoNuevo} onChange={(e) => setFechaIngresoNuevo(e.target.value)} />
            </label>
            <label>
              Rol
              <select value={rolNuevo} onChange={(e) => setRolNuevo(e.target.value)}>
                <option value="VENDEDOR">Vendedor</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="ADMIN">Admin</option>
              </select>
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="cta-primaria" type="submit" disabled={guardandoNuevo}>
                {guardandoNuevo ? 'Creando…' : 'Crear vendedor'}
              </button>
              <button type="button" className="cta-secundaria" onClick={() => setMostrarFormNuevo(false)} disabled={guardandoNuevo}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        {cargando && <p>Cargando…</p>}
        {!cargando && vendedores.length === 0 && <p className="texto-ayuda">Todavía no hay vendedores cargados.</p>}

        {!cargando && vendedores.length > 0 && (
          <div className="lista-vendedores-admin">
            {vendedores.map((v) => (
              <TarjetaVendedorAdmin
                key={v.id}
                vendedor={v}
                token={token}
                expandido={expandidoId === v.id}
                onToggle={() => setExpandidoId(expandidoId === v.id ? null : v.id)}
                onToggleActivo={manejarToggleActivo}
                onAbrirReset={setResetTarget}
                procesando={procesandoId === v.id}
                setError={setError}
              />
            ))}
          </div>
        )}

        {resetTarget && (
          <ModalResetPassword vendedor={resetTarget} token={token} onCerrar={() => setResetTarget(null)} />
        )}
      </div>
    </div>
  );
}
