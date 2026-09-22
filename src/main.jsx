import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// El <link rel="manifest"> por defecto (index.html) es el del panel de
// negocio -- acá se cambia al de Vendedores solo cuando corresponde, antes
// de que el navegador evalúe si la página es instalable. Bug real
// corregido 2026-09-22: antes se servía un único manifest.json (el de
// Vendedores, start_url "/vendedor/login") para todo el sitio, así que
// cualquier negocio (ej. LuxVision) que instalaba la app en su celular
// terminaba abriendo el login de vendedores en vez del suyo.
if (window.location.pathname.startsWith('/vendedor')) {
  const linkManifest = document.querySelector('link[rel="manifest"]');
  if (linkManifest) linkManifest.setAttribute('href', '/manifest.json');
  const linkIcono = document.querySelector('link[rel="apple-touch-icon"]');
  if (linkIcono) linkIcono.setAttribute('href', '/icon-vendedor-192.png');
}

// Registro del service worker — habilita que el navegador ofrezca
// "instalar" el panel como app en el celular (ícono propio, sin barra de
// navegador). Se registra después de que cargue la página para no
// competir con la carga inicial de React.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Error registrando el service worker:', err);
    });
  });
}