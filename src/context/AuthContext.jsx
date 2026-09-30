import { createContext, useContext, useEffect, useState } from 'react';
import { login as loginRequest, fetchMe } from '../api/client';

const AuthContext = createContext(null);

const STORAGE_KEY = 'agendabot_panel_session';

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);

  // Al montar: recuperar sesión guardada y validarla contra el backend
  useEffect(() => {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (!guardado) {
      setCargandoSesion(false);
      return;
    }

    try {
      const { token: tokenGuardado, usuario: usuarioGuardado } = JSON.parse(guardado);
      // Validamos que el token siga vigente antes de confiar en él -- pero
      // solo lo botamos si el backend contestó 401 (token realmente
      // inválido/vencido). Cualquier otro fallo (Render recién despertando
      // de estar inactivo, red inestable, etc.) no es evidencia de que la
      // sesión sea inválida, así que la mantenemos con los datos guardados
      // en vez de forzar un nuevo login en cada visita.
      fetchMe(tokenGuardado)
        .then(() => {
          setToken(tokenGuardado);
          setUsuario(usuarioGuardado);
        })
        .catch((err) => {
          if (err.status === 401) {
            localStorage.removeItem(STORAGE_KEY);
          } else {
            setToken(tokenGuardado);
            setUsuario(usuarioGuardado);
          }
        })
        .finally(() => setCargandoSesion(false));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      setCargandoSesion(false);
    }
  }, []);

  async function iniciarSesion(email, password) {
    const data = await loginRequest(email, password);
    setToken(data.token);
    setUsuario(data.usuario);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: data.token, usuario: data.usuario }));
    return data.usuario;
  }

  function cerrarSesion() {
    setToken(null);
    setUsuario(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  // Para flujos que ya trajeron { token, usuario } de otro endpoint que no es
  // /auth/login (ej. POST /auth/activar-cuenta) — misma forma de respuesta,
  // pero sin repetir la llamada de login.
  function establecerSesion(data) {
    setToken(data.token);
    setUsuario(data.usuario);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: data.token, usuario: data.usuario }));
  }

  return (
    <AuthContext.Provider value={{ usuario, token, cargandoSesion, iniciarSesion, cerrarSesion, establecerSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de un <AuthProvider>');
  }
  return ctx;
}
