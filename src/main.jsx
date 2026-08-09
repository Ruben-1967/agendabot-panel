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