import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { conectarWhatsApp } from '../../api/client';

const SDK_SRC = 'https://connect.facebook.net/es_LA/sdk.js';
const GRAPH_API_VERSION = 'v21.0';
// El popup de Embedded Signup puede correr bajo distintos subdominios de
// Meta (www.facebook.com, web.facebook.com en móvil, y potencialmente
// otros) — Meta documenta validar que el origen termine en "facebook.com",
// no una lista fija de dominios exactos, o el postMessage con
// waba_id/phone_number_id se descarta en silencio. Se valida el hostname
// real (no un endsWith ingenuo del string completo) para no aceptar un
// dominio spoofeado tipo "evilfacebook.com".
function esOrigenMeta(origen) {
  try {
    const { protocol, hostname } = new URL(origen);
    return protocol === 'https:' && (hostname === 'facebook.com' || hostname.endsWith('.facebook.com'));
  } catch {
    return false;
  }
}

// Cuánto esperar, después de que FB.login() ya entregó un "code" válido, a
// que llegue el postMessage WA_EMBEDDED_SIGNUP con waba_id/phone_number_id
// antes de darnos por vencidos. Sin este límite, si Meta corta el registro
// del número de su lado (visto en producción: "Empresa no puede registrar
// clientes") y nunca manda FINISH ni CANCEL/ERROR, el botón queda
// "Conectando…" para siempre sin ninguna explicación.
const ESPERA_DATOS_WABA_MS = 15000;

// Promesa a nivel de módulo (no de componente): garantiza que el script se
// inyecte y FB.init() se ejecute UNA sola vez por carga de página, aunque el
// useEffect que la llama se dispare dos veces (React StrictMode en dev) o el
// componente se desmonte/remonte. Sin esto, una doble inicialización puede
// dejar el SDK en un estado inconsistente que ignora las opciones de
// FB.login() (se observó en producción: override_default_response_type no
// se respetaba y Meta caía al response_type=token por defecto).
//
// El query string ?nocache= fuerza al navegador a pedir sdk.js de nuevo en
// cada carga de página en vez de reusar una copia cacheada — connect.
// facebook.net/{locale}/sdk.js no lleva versión en la URL, así que el
// navegador puede quedarse con una copia vieja del SDK que no soporta
// override_default_response_type.
let sdkFacebookPromise = null;

// Meta documenta que los eventos CANCEL/ERROR del postMessage
// WA_EMBEDDED_SIGNUP traen { current_step, error_id, error_message,
// session_id } en "data" — más información que el mensaje genérico que ve
// el usuario en la ventana de Meta. La mostramos en pantalla (no solo en
// consola) para no depender de que alguien abra DevTools la próxima vez que
// falle en un intento real.
function describirFalloEmbeddedSignup(data) {
  if (!data) return 'El proceso de conexión con Meta se canceló o falló antes de completarse.';

  const partes = [];
  if (data.error_message) partes.push(data.error_message);
  if (data.current_step) partes.push(`paso: ${data.current_step}`);
  if (data.error_id) partes.push(`error_id: ${data.error_id}`);
  if (data.session_id) partes.push(`session_id: ${data.session_id}`);

  return partes.length > 0
    ? `Meta rechazó la conexión — ${partes.join(' — ')}`
    : 'El proceso de conexión con Meta se canceló o falló antes de completarse.';
}

// A veces Meta responde con `authResponse.code` directo (lo esperado con
// response_type: 'code'), pero otras veces (visto en producción 2026-08-20,
// status "connected" tratado como fallo) devuelve accessToken + signedRequest
// en su lugar, con el code anidado ADENTRO del signedRequest — no ausente,
// solo en otro lugar. Sin este fallback, un login que sí funcionó se
// mostraba como error ("No se completó el inicio de sesión") y el flujo se
// abandonaba antes de llegar al paso de selección de WABA/número.
function extraerCodeDeSignedRequest(signedRequest) {
  if (!signedRequest) return null;
  try {
    const payload = signedRequest.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const conPadding = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const binario = atob(conPadding);
    // atob() decodifica a Latin1 — este paso lo reinterpreta como UTF-8 para
    // no corromper caracteres no-ASCII si algún día aparecen en el payload.
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

// --- Diagnóstico del salto de apps en Coexistence (fase 1, solo lectura) ---
//
// Hipótesis a confirmar/descartar: cuando el usuario vuelve de confirmar el
// pairing en la app de WhatsApp Business, FB.login() a veces entrega
// status "unknown" en vez de "connected". No sabemos todavía si eso pasa
// porque (a) Safari recarga la página al volver del salto (perdiendo el
// contexto/callback pendiente) o (b) es una respuesta legítima del SDK sin
// pérdida de contexto. Esta sección solo agrega logging — ningún cambio de
// comportamiento.
//
// MARCADOR_INTENTO_KEY se graba en sessionStorage justo antes de invocar
// FB.login(), con un id único y el timestamp de inicio. Si el componente se
// vuelve a montar (ej. tras un reload) con ese marcador todavía presente y
// sin limpiar, es indicio de que el intento anterior nunca llegó a
// resolverse en el mismo contexto de página (ni éxito, ni CANCEL/ERROR).
const MARCADOR_INTENTO_KEY = 'agendabot_embedded_signup_intento_diag';

// performance.getEntriesByType('navigation')[0].type distingue 'navigate'
// (carga normal), 'reload' (recarga) y 'back_forward' — es la forma más
// directa de confirmar si el documento actual viene de una recarga real.
// document.visibilityState complementa esto para correlacionar con el
// momento exacto del salto de apps.
function capturarContextoPagina() {
  const navEntry = performance.getEntriesByType('navigation')[0];
  return {
    visibilityState: document.visibilityState,
    navigationType: navEntry?.type || null,
  };
}

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
      sdkFacebookPromise = null; // permite reintentar si falló la carga
      reject(new Error('No se pudo cargar el SDK de Facebook'));
    };
    document.body.appendChild(script);
  });

  return sdkFacebookPromise;
}

export default function ConectarWhatsApp() {
  const { token } = useAuth();
  const [sdkListo, setSdkListo] = useState(false);
  const [conectando, setConectando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null);
  // null hasta que el usuario elige — evita disparar el flujo con un modo
  // por defecto incorrecto (ver conversación 2026-08-20 sobre error #3441045:
  // Coexistence exige ~7 días de actividad previa en la app de WhatsApp
  // Business, que un número nuevo dedicado al bot nunca va a tener).
  const [usaWhatsappBusinessApp, setUsaWhatsappBusinessApp] = useState(null);

  const appId = import.meta.env.VITE_META_APP_ID;
  const configId = import.meta.env.VITE_META_CONFIG_ID;

  // Junta las dos mitades del resultado de Embedded Signup: el "code" viene
  // del callback de FB.login(), y wabaId/phoneNumberId vienen por separado
  // vía postMessage (evento WA_EMBEDDED_SIGNUP). Pueden llegar en cualquier
  // orden, así que los acumulamos en un ref y disparamos el backend recién
  // cuando están los tres.
  const datosSignupRef = useRef({ code: null, wabaId: null, phoneNumberId: null, requierePhoneNumberId: true });
  const yaEnviadoRef = useRef(false);
  const timeoutEsperaRef = useRef(null);
  // Diagnóstico del salto de apps: { id, iniciadoEn } del intento de
  // FB.login() en curso — ver sección "Diagnóstico del salto de apps" arriba.
  const intentoActualRef = useRef(null);

  function limpiarTimeoutEspera() {
    if (timeoutEsperaRef.current) {
      clearTimeout(timeoutEsperaRef.current);
      timeoutEsperaRef.current = null;
    }
  }

  useEffect(() => {
    if (!appId) {
      setError('Falta VITE_META_APP_ID en la configuración del panel.');
      return;
    }
    cargarSdkFacebook(appId)
      .then(() => setSdkListo(true))
      .catch((err) => setError(err.message));
  }, [appId]);

  useEffect(() => limpiarTimeoutEspera, []);

  // Diagnóstico del salto de apps (fase 1): al montar, registra si el
  // documento actual viene de una recarga (performance navigation type) y si
  // quedó un marcador de un intento anterior sin limpiar en sessionStorage —
  // eso último indicaría que un FB.login() previo nunca alcanzó a resolverse
  // en este mismo contexto de página (ver MARCADOR_INTENTO_KEY arriba).
  useEffect(() => {
    const contexto = capturarContextoPagina();
    console.log('[EMBEDDED SIGNUP][DIAG] Montaje de ConectarWhatsApp:', JSON.stringify(contexto));

    let marcadorPrevio = null;
    try {
      marcadorPrevio = sessionStorage.getItem(MARCADOR_INTENTO_KEY);
    } catch {
      // sessionStorage puede no estar disponible (ej. modo privado) — no es crítico para el diagnóstico
    }

    if (marcadorPrevio) {
      console.warn(
        '[EMBEDDED SIGNUP][DIAG] Se encontró un marcador de intento previo sin limpiar al montar ' +
        '(posible indicio de recarga durante el salto de apps):',
        marcadorPrevio,
        JSON.stringify(contexto)
      );
      try {
        sessionStorage.removeItem(MARCADOR_INTENTO_KEY);
      } catch {
        // no crítico
      }
    }
  }, []);

  // Diagnóstico del salto de apps (fase 1): registra transiciones de
  // visibilidad y eventos pageshow con su timestamp, para correlacionar el
  // momento exacto en que el usuario vuelve de la app de WhatsApp Business
  // con la respuesta status:"unknown" que llega al callback de FB.login().
  // event.persisted en pageshow indica si la página se restauró desde el
  // caché de retroceso/avance (bfcache) en vez de recargarse.
  useEffect(() => {
    function alCambiarVisibilidad() {
      console.log(`[EMBEDDED SIGNUP][DIAG] visibilitychange -> ${document.visibilityState} @ ${Date.now()}`);
    }
    function alMostrarPagina(event) {
      console.log(`[EMBEDDED SIGNUP][DIAG] pageshow persisted=${event.persisted} @ ${Date.now()}`);
    }

    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    window.addEventListener('pageshow', alMostrarPagina);
    return () => {
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      window.removeEventListener('pageshow', alMostrarPagina);
    };
  }, []);

  useEffect(() => {
    function alRecibirMensaje(event) {
      if (!esOrigenMeta(event.origin)) return;

      let datos;
      try {
        datos = JSON.parse(event.data);
      } catch {
        return; // el SDK de FB manda otros mensajes que no son JSON, se ignoran
      }

      if (datos.type !== 'WA_EMBEDDED_SIGNUP') return;

      // Log completo siempre, incluso en FINISH: si algo falla más adelante
      // (ej. el backend rechaza el code) queremos poder correlacionar con lo
      // que Meta mandó acá, no solo con el mensaje amigable que ve el usuario.
      console.log('[EMBEDDED SIGNUP] postMessage recibido de Meta:', JSON.stringify(datos));

      if (datos.event === 'FINISH' || datos.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
        // FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING es el evento de Coexistence
        // ("conectar app existente") — Meta solo manda waba_id, nunca
        // phone_number_id. No es un caso incompleto: requierePhoneNumberId
        // (fijado en manejarConectar según usaWhatsappBusinessApp) ya le dice
        // a intentarEnviarAlBackend() que no debe esperarlo.
        datosSignupRef.current.wabaId = datos.data?.waba_id || null;
        datosSignupRef.current.phoneNumberId = datos.data?.phone_number_id || null;
        intentarEnviarAlBackend();
      } else if (datos.event === 'CANCEL' || datos.event === 'ERROR') {
        limpiarTimeoutEspera();
        setConectando(false);
        setError(describirFalloEmbeddedSignup(datos.data));
      }
    }

    window.addEventListener('message', alRecibirMensaje);
    return () => window.removeEventListener('message', alRecibirMensaje);
  }, []);

  async function intentarEnviarAlBackend() {
    const { code, wabaId, phoneNumberId, requierePhoneNumberId } = datosSignupRef.current;
    if (!code || !wabaId || yaEnviadoRef.current) return;
    if (requierePhoneNumberId && !phoneNumberId) return;

    limpiarTimeoutEspera();
    yaEnviadoRef.current = true;
    try {
      const empresaActualizada = await conectarWhatsApp(token, { code, wabaId, phoneNumberId });
      setResultado(empresaActualizada);
    } catch (err) {
      setError(err.message);
    } finally {
      setConectando(false);
      // El intento se resolvió (éxito o rechazo del backend) — limpia el
      // marcador de diagnóstico para no confundir el próximo intento.
      try {
        sessionStorage.removeItem(MARCADOR_INTENTO_KEY);
      } catch {
        // no crítico
      }
    }
  }

  function manejarConectar() {
    if (!window.FB || !configId) {
      setError('Falta VITE_META_CONFIG_ID en la configuración del panel.');
      return;
    }

    setError('');
    setResultado(null);
    datosSignupRef.current = {
      code: null,
      wabaId: null,
      phoneNumberId: null,
      // Fijado acá (no al recibir el postMessage) porque intentarEnviarAlBackend()
      // también se llama desde el callback de FB.login() más abajo, que puede
      // disparar antes de que llegue el evento — no hay orden garantizado entre
      // ambos. usaWhatsappBusinessApp ya es la elección del usuario que decide
      // el featureType de FB.login(), así que refleja el flujo real sin
      // depender de qué llegó primero.
      requierePhoneNumberId: !usaWhatsappBusinessApp,
    };
    yaEnviadoRef.current = false;
    limpiarTimeoutEspera();
    setConectando(true);

    // Diagnóstico del salto de apps: registra el inicio de este intento antes
    // de invocar FB.login() (justo antes de que el usuario deba salir a la
    // app de WhatsApp Business a confirmar el pairing). Se guarda tanto en un
    // ref (sobrevive si el contexto de página NO se recarga) como en
    // sessionStorage (sobrevive incluso si el ref se pierde, siempre que el
    // navegador no descarte la pestaña por completo).
    const intentoId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    intentoActualRef.current = { id: intentoId, iniciadoEn: Date.now() };
    try {
      sessionStorage.setItem(MARCADOR_INTENTO_KEY, JSON.stringify(intentoActualRef.current));
    } catch {
      // sessionStorage puede no estar disponible (ej. modo privado) — no es crítico para el diagnóstico
    }
    console.log('[EMBEDDED SIGNUP][DIAG] Iniciando FB.login() — a punto de saltar a la app de WhatsApp Business:', JSON.stringify(intentoActualRef.current));

    window.FB.login(
      (response) => {
        // Log completo siempre — el mensaje amigable que ve el usuario en la
        // ventana de Meta (ej. "Empresa no puede registrar clientes") no es
        // lo mismo que lo que este callback recibe; acá puede venir un
        // status/error de la API de Facebook que ayuda a diagnosticar.
        console.log('[EMBEDDED SIGNUP] Respuesta de FB.login():', JSON.stringify(response));

        const code = extraerCode(response);
        if (code) {
          datosSignupRef.current.code = code;
          // A partir de acá lo único que falta es el postMessage con
          // waba_id/phone_number_id — si nunca llega, avisamos en vez de
          // dejar el botón "Conectando…" pegado para siempre.
          timeoutEsperaRef.current = setTimeout(() => {
            if (!yaEnviadoRef.current) {
              setConectando(false);
              setError(
                'Meta autorizó el acceso pero nunca confirmó los datos del número de WhatsApp (no llegó la señal de fin de registro). ' +
                'Es probable que el registro se haya interrumpido del lado de Meta antes de completarse — revisa la consola para más detalle.'
              );
            }
          }, ESPERA_DATOS_WABA_MS);
          intentarEnviarAlBackend();
        } else {
          setConectando(false);
          const detalle = response?.status ? ` (status: ${response.status})` : '';

          // Diagnóstico ampliado del salto de apps (fase 1) — no cambia el
          // mensaje que ve el usuario, solo agrega contexto en consola para
          // confirmar o descartar si hubo pérdida de contexto de página
          // (reload) entre el momento en que se invocó FB.login() y esta
          // respuesta. Compara el intento guardado en el ref (sobrevive solo
          // si NO hubo reload) contra el mismo dato guardado en sessionStorage
          // (sobrevive salvo que el navegador haya descartado la pestaña).
          const contexto = capturarContextoPagina();
          const intento = intentoActualRef.current;
          let marcadorSessionStorage = null;
          try {
            marcadorSessionStorage = sessionStorage.getItem(MARCADOR_INTENTO_KEY);
          } catch {
            // no crítico
          }
          console.warn('[EMBEDDED SIGNUP][DIAG] FB.login() no entregó code — contexto completo:', JSON.stringify({
            response,
            contexto,
            intento,
            elapsedMsDesdeInicioDelSalto: intento ? Date.now() - intento.iniciadoEn : null,
            marcadorSessionStorageIntacto: intento ? marcadorSessionStorage === JSON.stringify(intento) : null,
          }));
          try {
            sessionStorage.removeItem(MARCADOR_INTENTO_KEY);
          } catch {
            // no crítico
          }

          setError(`No se completó el inicio de sesión con Meta${detalle}. Revisa la consola para el detalle completo.`);
        }
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        // featureType vacío hacía que Meta tratara cualquier número que ya
        // tuviera la app de WhatsApp Business activa como un conflicto a
        // resolver "migrando o desconectando" en vez de ofrecer conectar la
        // cuenta existente (Coexistence) — este valor es el que habilita esa
        // opción, según documentación de Meta. Pero Coexistence exige que el
        // número tenga actividad real reciente en la app (error #3441045 si
        // no la tiene) — para un número nuevo dedicado solo al bot hay que
        // omitir featureType y usar el registro estándar de Cloud API.
        extras: usaWhatsappBusinessApp
          ? { setup: {}, featureType: 'whatsapp_business_app_onboarding', sessionInfoVersion: '3' }
          : { setup: {}, sessionInfoVersion: '3' },
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

      <fieldset style={{ marginBottom: '1rem' }}>
        <legend>¿Cómo desea conectar su número?</legend>
        <p style={{ marginTop: 0, marginBottom: '0.75rem' }}>
          Meta requiere saber si este número ya tiene la app de WhatsApp Business instalada y en
          uso, o si es un número nuevo dedicado solo al bot — el flujo de registro es distinto
          para cada caso.
        </p>

        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
          <input
            type="radio"
            name="modo-conexion"
            checked={usaWhatsappBusinessApp === true}
            onChange={() => setUsaWhatsappBusinessApp(true)}
          />{' '}
          Sí, ya uso la app de WhatsApp Business con este número
          <br />
          <small>
            Elija esta opción solo si el número tiene actividad real reciente (varios días) en la
            app de WhatsApp Business — Meta lo exige para conservarla en paralelo con el bot
            (Coexistencia).
          </small>
        </label>

        <label style={{ display: 'block' }}>
          <input
            type="radio"
            name="modo-conexion"
            checked={usaWhatsappBusinessApp === false}
            onChange={() => setUsaWhatsappBusinessApp(false)}
          />{' '}
          No, quiero un número nuevo dedicado solo al bot
          <br />
          <small>
            Registro directo en Cloud API — no requiere historial previo. Si el número tiene la
            app de WhatsApp Business instalada, desvincúlela antes de continuar (Configuración
            &gt; Cuenta &gt; Plataforma empresarial &gt; Desconectar).
          </small>
        </label>
      </fieldset>

      <button onClick={manejarConectar} disabled={!sdkListo || conectando || usaWhatsappBusinessApp === null}>
        {conectando ? 'Conectando…' : 'Conectar WhatsApp Business'}
      </button>
    </div>
  );
}