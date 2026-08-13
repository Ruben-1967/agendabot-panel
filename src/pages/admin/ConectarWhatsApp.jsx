import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { conectarWhatsApp } from '../../api/client';

const SDK_SRC = 'https://connect.facebook.net/es_LA/sdk.js';
const GRAPH_API_VERSION = 'v21.0';
const ORIGEN_META = 'https://www.facebook.com';

// Carga el SDK de Facebook una sola vez y lo inicializa con el App ID del
// panel. Si ya está cargado (navegación de vuelta a esta página) no vuelve
// a inyectar el script.
function cargarSdkFacebook(appId) {
  return new Promise((resolve, reject) => {
    if (window.FB) {
      resolve(window.FB);
      return;
    }

    window.fbAsyncInit = function () {
      window.FB.init({ appId, xfbml: false, version: GRAPH_API_VERSION });
      resolve(window.FB);
    };

    if (document.getElementById('facebook-jssdk')) return;

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = SDK_SRC;
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.onerror = () => reject(new Error('No se pudo cargar el SDK de Facebook'));
    document.body.appendChild(script);
  });
}

export default function ConectarWhatsApp() {
  const { token } = useAuth();
  const [sdkListo, setSdkListo] = useState(false);
  const [conectando, setConectando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null);

  const appId = import.meta.env.VITE_META_APP_ID;
  const configId = import.meta.env.VITE_META_CONFIG_ID;

  // Junta las dos mitades del resultado de Embedded Signup: el "code" viene
  // del callback de FB.login(), y wabaId/phoneNumberId vienen por separado
  // vía postMessage (evento WA_EMBEDDED_SIGNUP). Pueden llegar en cualquier
  // orden, así que los acumulamos en un ref y disparamos el backend recién
  // cuando están los tres.
  const datosSignupRef = useRef({ code: null, wabaId: null, phoneNumberId: null });
  const yaEnviadoRef = useRef(false);

  useEffect(() => {
    if (!appId) {
      setError('Falta VITE_META_APP_ID en la configuración del panel.');
      return;
    }
    cargarSdkFacebook(appId)
      .then(() => setSdkListo(true))
      .catch((err) => setError(err.message));
  }, [appId]);

  useEffect(() => {
    function alRecibirMensaje(event) {
      if (event.origin !== ORIGEN_META) return;

      let datos;
      try {
        datos = JSON.parse(event.data);
      } catch {
        return; // el SDK de FB manda otros mensajes que no son JSON, se ignoran
      }

      if (datos.type !== 'WA_EMBEDDED_SIGNUP') return;

      if (datos.event === 'FINISH') {
        datosSignupRef.current.wabaId = datos.data?.waba_id || null;
        datosSignupRef.current.phoneNumberId = datos.data?.phone_number_id || null;
        intentarEnviarAlBackend();
      } else if (datos.event === 'CANCEL' || datos.event === 'ERROR') {
        setConectando(false);
        setError('El proceso de conexión con Meta se canceló o falló antes de completarse.');
      }
    }

    window.addEventListener('message', alRecibirMensaje);
    return () => window.removeEventListener('message', alRecibirMensaje);
  }, []);

  async function intentarEnviarAlBackend() {
    const { code, wabaId, phoneNumberId } = datosSignupRef.current;
    if (!code || !wabaId || !phoneNumberId || yaEnviadoRef.current) return;

    yaEnviadoRef.current = true;
    try {
      const empresaActualizada = await conectarWhatsApp(token, { code, wabaId, phoneNumberId });
      setResultado(empresaActualizada);
    } catch (err) {
      setError(err.message);
    } finally {
      setConectando(false);
    }
  }

  function manejarConectar() {
    if (!window.FB || !configId) {
      setError('Falta VITE_META_CONFIG_ID en la configuración del panel.');
      return;
    }

    setError('');
    setResultado(null);
    datosSignupRef.current = { code: null, wabaId: null, phoneNumberId: null };
    yaEnviadoRef.current = false;
    setConectando(true);

    window.FB.login(
      (response) => {
        if (response.authResponse?.code) {
          datosSignupRef.current.code = response.authResponse.code;
          intentarEnviarAlBackend();
        } else {
          setConectando(false);
          setError('No se completó el inicio de sesión con Meta.');
        }
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: { setup: {}, featureType: '', sessionInfoVersion: '3' },
      }
    );
  }

  return (
    <div>
      <h1>Conectar WhatsApp</h1>
      <p className="pagina-sub">
        Conecta el número de WhatsApp Business de esta empresa usando el flujo oficial de Meta
        (Embedded Signup). Usa primero un número de prueba antes de conectar el número real.
      </p>

      {error && <p className="mensaje-error">{error}</p>}
      {resultado && (
        <p className="mensaje-ok">
          WhatsApp conectado: {resultado.whatsappPhoneNumber} (empresa: {resultado.nombre}).
        </p>
      )}

      <button onClick={manejarConectar} disabled={!sdkListo || conectando}>
        {conectando ? 'Conectando…' : 'Conectar WhatsApp Business'}
      </button>
    </div>
  );
}
