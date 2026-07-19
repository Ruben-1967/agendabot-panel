import { createContext, useContext, useEffect, useState } from 'react';
import { loginVendedor as loginVendedorRequest } from '../api/client';

const VendedorAuthContext = createContext(null);

// Llave distinta a 'agendabot_panel_session' a propósito: un vendedor y un
// negocio pueden probar el panel desde el mismo dispositivo sin pisarse.
const STORAGE_KEY = 'agendabot_vendedor_session';

export function VendedorAuthProvider({ children }) {
  const [vendedor, setVendedor] = useState(null);
  const [token, setToken] = useState(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);

  // A diferencia del panel de negocios, no hay un endpoint /auth-vendedor/me
  // todavía para revalidar el token al cargar — confiamos en lo guardado y
  // dejamos que cualquier llamada real falle con 401 si el token expiró
  // (ver manejo de error en cada pantalla).
  useEffect(() => {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (!guardado) {
      setCargandoSesion(false);
      return;
    }
    try {
      const { token: tokenGuardado, vendedor: vendedorGuardado } = JSON.parse(guardado);
      setToken(tokenGuardado);
      setVendedor(vendedorGuardado);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setCargandoSesion(false);
    }
  }, []);

  async function iniciarSesionVendedor(email, password) {
    const data = await loginVendedorRequest(email, password);
    setToken(data.token);
    setVendedor(data.vendedor);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: data.token, vendedor: data.vendedor }));
    return data.vendedor;
  }

  function cerrarSesionVendedor() {
    setToken(null);
    setVendedor(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <VendedorAuthContext.Provider
      value={{ vendedor, token, cargandoSesion, iniciarSesionVendedor, cerrarSesionVendedor }}
    >
      {children}
    </VendedorAuthContext.Provider>
  );
}

export function useVendedorAuth() {
  const ctx = useContext(VendedorAuthContext);
  if (!ctx) {
    throw new Error('useVendedorAuth debe usarse dentro de un <VendedorAuthProvider>');
  }
  return ctx;
}