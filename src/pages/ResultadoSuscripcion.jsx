import { useSearchParams } from 'react-router-dom';
import './vendedor/vendedor.css';

const MENSAJES_ERROR = {
  tarjeta: 'No pudimos confirmar el registro de tu tarjeta en Flow. Puede que hayas cancelado el proceso o que Flow haya rechazado los datos.',
  servidor: 'Ocurrió un error de nuestro lado procesando tu pago. Ya quedó registrado para revisión.',
  parametros: 'El link de retorno de Flow llegó incompleto.',
  plan: 'El plan indicado no es válido.',
  suscripcion: 'No encontramos tu suscripción para continuar con el cobro.',
};

export default function ResultadoSuscripcion() {
  const [searchParams] = useSearchParams();
  const estado = searchParams.get('estado');
  const motivo = searchParams.get('motivo');
  const empresaId = searchParams.get('empresaId');

  return (
    <div className="pantalla-login">
      <div className="login-card">
        <div className="login-brand">
          Agenda<span className="accent">Bot</span>
        </div>

        {estado === 'procesando' && (
          <>
            <p className="login-sub">Confirmando tu pago…</p>
            <p>
              Registramos tu tarjeta correctamente y ya estamos procesando el primer cobro (plan + hosting anual)
              con Flow. Esto puede demorar unos minutos.
            </p>
            <p>
              Te vamos a avisar por WhatsApp apenas quede confirmado. También podés entrar a tu panel más tarde
              para ver el estado.
            </p>
            <a href="/login" className="login-link">Ir a iniciar sesión →</a>
          </>
        )}

        {estado === 'exito' && (
          <>
            <p className="login-sub">¡Listo!</p>
            <p>Tu cuenta ya está activa — no correspondía ningún cobro en este ciclo.</p>
            <a href="/login" className="login-link">Ir a iniciar sesión →</a>
          </>
        )}

        {estado === 'error' && (
          <>
            <p className="login-sub">No pudimos completar el pago</p>
            <p className="login-error">{MENSAJES_ERROR[motivo] || 'Ocurrió un error inesperado.'}</p>
            {empresaId && (
              <a href={`/suscripcion/elegir-plan?empresaId=${empresaId}`} className="login-link">
                Volver a intentar →
              </a>
            )}
          </>
        )}

        {!estado && (
          <p className="login-sub">Nada que mostrar acá todavía.</p>
        )}
      </div>
    </div>
  );
}
