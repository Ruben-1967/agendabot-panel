import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { solicitarCodigo, verificarCodigo } from '../api/client';

// Login sin contraseña (código de 6 dígitos por email) como camino por
// defecto. Idea original: código por WhatsApp (mismo patrón del proyecto
// hermano Norman) -- Meta rechazó la plantilla necesaria (un código de
// acceso es contenido categoría AUTHENTICATION, que exige un piso de
// volumen que esta WABA compartida no alcanza), así que se manda por email
// en su lugar -- reusa el mismo campo `email` que el login viejo. El
// email+contraseña sigue funcionando (ver PASOS.PASSWORD más abajo), nunca
// se quitó, solo dejó de ser el camino principal.
const PASOS = { EMAIL: 'email', CODIGO: 'codigo', PASSWORD: 'password' };

export default function Login() {
  const { iniciarSesion, establecerSesion } = useAuth();
  const navigate = useNavigate();

  const [paso, setPaso] = useState(PASOS.EMAIL);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');

  function irAlPanel(usuario) {
    navigate(usuario.rol === 'PROFESIONAL' ? '/profesional' : '/admin', { replace: true });
  }

  async function manejarSolicitarCodigo(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await solicitarCodigo(email);
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
      const data = await verificarCodigo(email, codigo);
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

  function volverAEmail() {
    setError('');
    setCodigo('');
    setPaso(PASOS.EMAIL);
  }

  return (
    <div className="pantalla-login">
      <div className="login-card">
        <div className="login-brand">
          Agenda<span className="accent">Bot</span>
        </div>
        <p className="login-sub">Panel de gestión</p>

        {paso === PASOS.EMAIL && (
          <form onSubmit={manejarSolicitarCodigo}>
            <label>
              Tu email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
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
              ¿Prefieres entrar con tu contraseña?
            </button>
          </form>
        )}

        {paso === PASOS.CODIGO && (
          <form onSubmit={manejarVerificarCodigo}>
            <p className="login-sub">Te enviamos un código a {email}</p>

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
              onClick={volverAEmail}
            >
              ¿Email equivocado? Volver
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
              onClick={() => { setError(''); setPaso(PASOS.EMAIL); }}
            >
              ¿Prefieres entrar con un código?
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
