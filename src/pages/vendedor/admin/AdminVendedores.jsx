import { useEffect, useState } from 'react';
import { useVendedorAuth } from '../../../context/VendedorAuthContext';
import { fetchVendedores, crearVendedor, alternarActivoVendedor, resetearPasswordVendedor } from '../../../api/client';
import NavVendedor from '../NavVendedor';
import '../vendedor.css';

function formatFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminVendedores() {
  const { token } = useVendedorAuth();
  const [vendedores, setVendedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [procesandoId, setProcesandoId] = useState(null);

  const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [emailNuevo, setEmailNuevo] = useState('');
  const [passwordNuevo, setPasswordNuevo] = useState('');
  const [rolNuevo, setRolNuevo] = useState('VENDEDOR');
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);

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
    try {
      await crearVendedor(token, { nombre: nombreNuevo.trim(), email: emailNuevo.trim(), password: passwordNuevo, rol: rolNuevo });
      setNombreNuevo('');
      setEmailNuevo('');
      setPasswordNuevo('');
      setRolNuevo('VENDEDOR');
      setMostrarFormNuevo(false);
      cargar();
    } catch (err) {
      setError(err.message || 'No se pudo crear el vendedor');
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

  async function manejarResetPassword(v) {
    const nueva = window.prompt(`Nueva contraseña para "${v.nombre}" (mínimo 6 caracteres):`);
    if (!nueva) return;
    if (nueva.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setProcesandoId(v.id);
    setError('');
    try {
      await resetearPasswordVendedor(token, v.id, nueva);
    } catch (err) {
      setError(err.message || 'No se pudo resetear la contraseña');
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
          Crea cuentas de vendedor, bloquéalas si alguien deja el equipo y resetea contraseñas cuando haga falta.
          Bloquear no reasigna los casos activos del vendedor — eso queda pendiente aparte.
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
              <input type="email" value={emailNuevo} onChange={(e) => setEmailNuevo(e.target.value)} required />
            </label>
            <label>
              Contraseña
              <input type="password" minLength={6} value={passwordNuevo} onChange={(e) => setPasswordNuevo(e.target.value)} required />
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
          <table className="tabla-admin-vendedor">
            <thead>
              <tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Desde</th><th></th></tr>
            </thead>
            <tbody>
              {vendedores.map((v) => (
                <tr key={v.id}>
                  <td>{v.nombre}</td>
                  <td>{v.email}</td>
                  <td>{v.rol}</td>
                  <td>
                    <span className={v.activo ? 'badge-exito' : 'badge-pendiente'}>
                      {v.activo ? 'Activo' : 'Bloqueado'}
                    </span>
                  </td>
                  <td>{formatFecha(v.creadoEn)}</td>
                  <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      className="cta-secundaria"
                      onClick={() => manejarToggleActivo(v)}
                      disabled={procesandoId === v.id}
                    >
                      {v.activo ? 'Bloquear' : 'Desbloquear'}
                    </button>
                    <button
                      className="cta-secundaria"
                      onClick={() => manejarResetPassword(v)}
                      disabled={procesandoId === v.id}
                    >
                      Cambiar contraseña
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
