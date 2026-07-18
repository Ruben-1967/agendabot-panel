const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Wrapper simple sobre fetch. Agrega el token JWT si existe y
 * lanza un error legible cuando la respuesta no es ok.
 */
async function apiFetch(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // respuesta sin cuerpo JSON
  }

  if (!res.ok) {
    const mensaje = data?.error || `Error ${res.status} al llamar a ${path}`;
    throw new Error(mensaje);
  }

  return data;
}

export function login(email, password) {
  return apiFetch('/auth/login', { method: 'POST', body: { email, password } });
}

export function fetchMe(token) {
  return apiFetch('/auth/me', { token });
}

// ---------- Catálogo rotativo: productos ----------
export function fetchProductos(token) {
  return apiFetch('/productos', { token });
}
export function crearProducto(token, data) {
  return apiFetch('/productos', { method: 'POST', body: data, token });
}
export function actualizarProducto(token, id, data) {
  return apiFetch(`/productos/${id}`, { method: 'PATCH', body: data, token });
}
export function eliminarProducto(token, id) {
  return apiFetch(`/productos/${id}`, { method: 'DELETE', token });
}

// ---------- Catálogo rotativo: campañas ----------
export function fetchCampanas(token) {
  return apiFetch('/campanas', { token });
}
export function crearCampana(token, data) {
  return apiFetch('/campanas', { method: 'POST', body: data, token });
}
export function prepararEnvioHoy(token, campanaId) {
  return apiFetch(`/campanas/${campanaId}/preparar-hoy`, { method: 'POST', token });
}
export function fetchEstimadoEnvio(token, campanaId) {
  return apiFetch(`/campanas/${campanaId}/estimar-envio`, { token });
}
export function enviarCampana(token, campanaId, envioId, productoIds) {
  return apiFetch(`/campanas/${campanaId}/envios/${envioId}/enviar`, {
    method: 'POST',
    body: { productoIds },
    token,
  });
}

// ---------- Catálogo rotativo: pedidos ----------
export function fetchPedidosHoy(token) {
  return apiFetch('/pedidos/hoy', { token });
}
export function actualizarEstadoPedido(token, id, estado) {
  return apiFetch(`/pedidos/${id}`, { method: 'PATCH', body: { estado }, token });
}

// ---------- Información del negocio ----------
export function fetchInfoNegocio(token) {
  return apiFetch('/empresa/info', { token });
}
export function actualizarInfoNegocio(token, data) {
  return apiFetch('/empresa/info', { method: 'PUT', body: data, token });
}

// ---------- Agenda: recurso, horario semanal, bloqueos ----------
export function fetchAgenda(token) {
  return apiFetch('/agenda', { token });
}
export function guardarRecurso(token, data) {
  return apiFetch('/agenda/recurso', { method: 'PUT', body: data, token });
}
export function guardarHorarios(token, bloques) {
  return apiFetch('/agenda/horarios', { method: 'PUT', body: { bloques }, token });
}
export function crearBloqueo(token, data) {
  return apiFetch('/agenda/bloqueos', { method: 'POST', body: data, token });
}
export function eliminarBloqueo(token, id) {
  return apiFetch(`/agenda/bloqueos/${id}`, { method: 'DELETE', token });
}

// ---------- Servicios ----------
export function fetchServicios(token) {
  return apiFetch('/servicios', { token });
}
export function crearServicio(token, data) {
  return apiFetch('/servicios', { method: 'POST', body: data, token });
}
export function actualizarServicio(token, id, data) {
  return apiFetch(`/servicios/${id}`, { method: 'PATCH', body: data, token });
}
export function eliminarServicio(token, id) {
  return apiFetch(`/servicios/${id}`, { method: 'DELETE', token });
}

export { API_URL };