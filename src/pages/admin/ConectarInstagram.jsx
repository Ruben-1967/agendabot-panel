import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { conectarInstagram } from '../../api/client';
import './ConectarWhatsApp.css';

const SDK_SRC = 'https://connect.facebook.net/es_LA/sdk.js';
const GRAPH_API_VERSION = 'v21.0';

// Promesa a nivel de módulo, mismo motivo que en ConectarWhatsApp.jsx:
// evita inicializar el SDK dos veces por carga de página. Variable propia
// (no compartida con ConectarWhatsApp.jsx) porque cada página usa un appId
// de Meta distinto (VITE_INSTAGRAM_APP_ID vs VITE_META_APP_ID).
let sdkFacebookPromise = null;

function cargarSdkFacebook(appId) {
  if (sdkFacebookPromise) return sdkFacebookPromise;

  sdkFacebookPromise = new Promise((resolve, reject) => {
    window.fbAsyncInit = function () {
      window.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version: GRAPH_API_VERSION });
      resolve(window.FB);
    };

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = `${SDK_SRC}?nocache=${Date.now()}`;
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.onerror = () => {
      sdkFacebookPromise = null;
      reject(new Error('No se pudo cargar el SDK de Facebook'));
    };
    document.body.appendChild(script);
  });

  return sdkFacebookPromise;
}

// A veces Meta responde con authResponse.code directo, otras con el code
// anidado dentro de signedRequest — mismo fallback que ConectarWhatsApp.jsx.
function extraerCodeDeSignedRequest(signedRequest) {
  if (!signedRequest) return null;
  try {
    const payload = signedRequest.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const conPadding = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const binario = atob(conPadding);
    const json = decodeURIComponent(
      binario
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    return JSON.parse(json).code || null;
  } catch {
    return null;
  }
}

function extraerCode(response) {
  return response.authResponse?.code || extraerCodeDeSignedRequest(response.authResponse?.signedRequest);
}

// A diferencia de WhatsApp (que necesita el postMessage WA_EMBEDDED_SIGNUP
// aparte para wabaId/phoneNumberId), acá con el "code" del callback de
// FB.login() alcanza: el backend resuelve la cuenta de Instagram directo
// con el token (ver POST /empresa/instagram/conectar).
export default function ConectarInstagram() {
  const { token } = useAuth();
  const [sdkListo, setSdkListo] = useState(false);
  const [conectando, setConectando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null);
  const yaEnviadoRef = useRef(false);

  const appId = import.meta.env.VITE_INSTAGRAM_APP_ID;
  const configId = import.meta.env.VITE_INSTAGRAM_CONFIG_ID;

  useEffect(() => {
    if (!appId) {
      setError('Falta VITE_INSTAGRAM_APP_ID en la configuración del panel.');
      return;
    }
    cargarSdkFacebook(appId)
      .then(() => setSdkListo(true))
      .catch((err) => setError(err.message));
  }, [appId]);

  function manejarConectar() {
    if (!window.FB || !configId) {
      setError('Falta VITE_INSTAGRAM_CONFIG_ID en la configuración del panel.');
      return;
    }

    setError('');
    setResultado(null);
    yaEnviadoRef.current = false;
    setConectando(true);

    window.FB.login(
      async (response) => {
        console.log('[INSTAGRAM SIGNUP] Respuesta de FB.login():', JSON.stringify(response));

        const code = extraerCode(response);
        if (!code || yaEnviadoRef.current) {
          setConectando(false);
          if (!code) {
            const detalle = response?.status ? ` (status: ${response.status})` : '';
            setError(`No se completó el inicio de sesión con Meta${detalle}.`);
          }
          return;
        }

        yaEnviadoRef.current = true;
        try {
          const empresaActualizada = await conectarInstagram(token, { code });
          setResultado(empresaActualizada);
        } catch (err) {
          setError(err.message);
        } finally {
          setConectando(false);
        }
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
      }
    );
  }

  return (
    <div className="conectar-whatsapp">
      <h1>Conectar Instagram</h1>
      <p className="pagina-sub">
        Conecta tu cuenta profesional de Instagram para recibir y responder mensajes directos desde
        el mismo bot que ya usas por WhatsApp.
      </p>

      {error && <p className="mensaje-error">{error}</p>}
      {resultado && (
        <p className="mensaje-ok">
          Instagram conectado: @{resultado.instagramUsername} (empresa: {resultado.nombre}).
        </p>
      )}

      <button className="boton-conectar-whatsapp" onClick={manejarConectar} disabled={!sdkListo || conectando}>
        {conectando ? 'Conectando…' : 'Conectar Instagram'}
      </button>
    </div>
  );
}
