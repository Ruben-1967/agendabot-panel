import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { iniciarSesion } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function manejarSubmit(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const usuario = await iniciarSesion(email, password);
      navigate(usuario.rol === 'PROFESIONAL' ? '/profesional' : '/admin', { replace: true });
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pantalla-login">
      <div className="login-card">
        <div className="login-brand">
          Agenda<span className="accent">Bot</span>
        </div>
        <p className="login-sub">Panel de gestión</p>

        <form onSubmit={manejarSubmit}>
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

          {error && <p className="login-error">{error}</p>}

          <button type="submit" disabled={enviando}>
            {enviando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
