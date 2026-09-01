import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { activarCuenta } from '../api/client';
import './vendedor/vendedor.css';

export default function ActivarCuenta() {
  const [searchParams] = useSearchParams();
  const tokenActivacion = searchParams.get('token');
  // El mismo token/endpoint sirve para la activación inicial de cuenta y
  // para un reset de contraseña a demanda (ver POST /auth/solicitar-reset-password)
  // — solo cambia el texto de la pantalla según de dónde vino el link.
  const esReset = searchParams.get('tipo') === 'reset';
  const { establecerSesion } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function manejarSubmit(e) {
    e.preventDefault();
    setError('');

    if (!tokenActivacion) {
      setError('Este link de activación no es válido.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setEnviando(true);
    try {
      const data = await activarCuenta(tokenActivacion, password);
      establecerSesion(data);
      // El plan ya lo eligió el vendedor al convertir la demo — no hace
      // falta volver a pedirlo acá, se entra directo al panel.
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message || 'No se pudo activar la cuenta');
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
        <p className="login-sub">{esReset ? 'Restablecer tu contraseña' : 'Activar tu cuenta'}</p>

        {!tokenActivacion ? (
          <p className="login-error">
            {esReset
              ? 'Este link de recuperación no es válido o ya venció. Solicita uno nuevo.'
              : 'Este link de activación no es válido. Pídele a tu vendedor que te reenvíe el link.'}
          </p>
        ) : (
          <form onSubmit={manejarSubmit}>
            <label>
              Nueva contraseña
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>

            <label>
              Confirmar contraseña
              <input
                type="password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>

            {error && <p className="login-error">{error}</p>}

            <button type="submit" disabled={enviando}>
              {enviando ? 'Guardando…' : (esReset ? 'Guardar nueva contraseña' : 'Activar cuenta y continuar')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
