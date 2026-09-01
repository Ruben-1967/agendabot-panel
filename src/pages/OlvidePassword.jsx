import { useState } from 'react';
import { Link } from 'react-router-dom';
import { solicitarResetPassword } from '../api/client';

export default function OlvidePassword() {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [enviado, setEnviado] = useState(false);

  async function manejarSubmit(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await solicitarResetPassword(email);
      // Siempre se muestra el mismo mensaje de éxito, exista o no el email
      // — el backend responde igual en ambos casos a propósito.
      setEnviado(true);
    } catch (err) {
      setError(err.message || 'No se pudo procesar la solicitud');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pantalla-login">
      <div className="login-card">
        <div className="login-brand">
          Totem<span className="accent">system</span>
        </div>
        <p className="login-sub">Recuperar contraseña</p>

        {enviado ? (
          <>
            <p>Si el email está registrado, te enviamos un link para restablecer tu contraseña por WhatsApp al número de contacto del negocio. Revisa los mensajes de los próximos minutos.</p>
            <Link to="/login">Volver a iniciar sesión</Link>
          </>
        ) : (
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

            {error && <p className="login-error">{error}</p>}

            <button type="submit" disabled={enviando}>
              {enviando ? 'Enviando…' : 'Enviar link de recuperación'}
            </button>

            <Link to="/login" className="login-link-secundario">Volver a iniciar sesión</Link>
          </form>
        )}
      </div>
    </div>
  );
}
