import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { solicitarCodigo, verificarCodigo } from '../api/client';

// Login sin contraseña (código de 6 dígitos por WhatsApp) como camino por
// defecto -- mismo patrón ya probado en el proyecto hermano Norman. El
// email+contraseña sigue funcionando (ver PASO_PASSWORD más abajo) para
// cuentas creadas antes de esta feature, que todavía no tienen un teléfono
// vinculado -- nunca se quitó, solo dejó de ser el camino principal.
const PASOS = { TELEFONO: 'telefono', CODIGO: 'codigo', PASSWORD: 'password' };

export default function Login() {
  const { iniciarSesion, establecerSesion } = useAuth();
  const navigate = useNavigate();

  const [paso, setPaso] = useState(PASOS.TELEFONO);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const [telefono, setTelefono] = useState('');
  const [codigo, setCodigo] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function irAlPanel(usuario) {
    navigate(usuario.rol === 'PROFESIONAL' ? '/profesional' : '/admin', { replace: true });
  }

  async function manejarSolicitarCodigo(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await solicitarCodigo(telefono);
      setPaso(PASOS.CODIGO);
    } catch (err) {
      setError(err.message || 'No se pudo enviar el código');
    } finally {
      setEnviando(false);
    }
  }

  async function manejarVerificarCodigo(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const data = await verificarCodigo(telefono, codigo);
      establecerSesion(data);
      irAlPanel(data.usuario);
    } catch (err) {
      setError(err.message || 'Código incorrecto');
    } finally {
      setEnviando(false);
    }
  }

  async function manejarLoginPassword(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const usuario = await iniciarSesion(email, password);
      irAlPanel(usuario);
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión');
    } finally {
      setEnviando(false);
    }
  }

  function volverATelefono() {
    setError('');
    setCodigo('');
    setPaso(PASOS.TELEFONO);
  }

  return (
    <div className="pantalla-login">
      <div className="login-card">
        <div className="login-brand">
          Agenda<span className="accent">Bot</span>
        </div>
        <p className="login-sub">Panel de gestión</p>

        {paso === PASOS.TELEFONO && (
          <form onSubmit={manejarSolicitarCodigo}>
            <label>
              Tu WhatsApp
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+56912345678"
                autoComplete="tel"
                required
              />
            </label>

            {error && <p className="login-error">{error}</p>}

            <button type="submit" disabled={enviando}>
              {enviando ? 'Enviando…' : 'Enviarme un código'}
            </button>

            <button
              type="button"
              className="login-olvide-password"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              onClick={() => { setError(''); setPaso(PASOS.PASSWORD); }}
            >
              ¿Prefieres entrar con tu email y contraseña?
            </button>
          </form>
        )}

        {paso === PASOS.CODIGO && (
          <form onSubmit={manejarVerificarCodigo}>
            <p className="login-sub">Te enviamos un código por WhatsApp a {telefono}</p>

            <label>
              Código de 6 dígitos
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                autoComplete="one-time-code"
                autoFocus
                required
              />
            </label>

            {error && <p className="login-error">{error}</p>}

            <button type="submit" disabled={enviando || codigo.length !== 6}>
              {enviando ? 'Verificando…' : 'Entrar'}
            </button>

            <button
              type="button"
              className="login-olvide-password"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              onClick={volverATelefono}
            >
              ¿Número equivocado? Volver
            </button>
          </form>
        )}

        {paso === PASOS.PASSWORD && (
          <form onSubmit={manejarLoginPassword}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </label>

            <label>
              Contraseña
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            <Link to="/olvide-password" className="login-olvide-password">¿Olvidaste tu contraseña?</Link>

            {error && <p className="login-error">{error}</p>}

            <button type="submit" disabled={enviando}>
              {enviando ? 'Ingresando…' : 'Ingresar'}
            </button>

            <button
              type="button"
              className="login-olvide-password"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              onClick={() => { setError(''); setPaso(PASOS.TELEFONO); }}
            >
              ¿Prefieres entrar con tu WhatsApp?
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
