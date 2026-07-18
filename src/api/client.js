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
export function fetchEstimadoEnvio(token, campanaId, clienteIds) {
  const query = clienteIds && clienteIds.length > 0 ? `?clienteIds=${clienteIds.join(',')}` : '';
  return apiFetch(`/campanas/${campanaId}/estimar-envio${query}`, { token });
}
export function enviarCampana(token, campanaId, envioId, productoIds, extra = {}) {
  return apiFetch(`/campanas/${campanaId}/envios/${envioId}/enviar`, {
    method: 'POST',
    body: { productoIds, ...extra },
    token,
  });
}

// ---------- Catálogo rotativo: segmentación de clientes (para elegir destinatarios puntuales) ----------
export function fetchSegmentacionClientes(token, filtros = {}) {
  const params = new URLSearchParams();
  if (filtros.dias) params.set('dias', filtros.dias);
  if (filtros.montoMinimo) params.set('montoMinimo', filtros.montoMinimo);
  if (filtros.minPedidos) params.set('minPedidos', filtros.minPedidos);
  if (filtros.productoId) params.set('productoId', filtros.productoId);
  if (filtros.diasSinComprar) params.set('diasSinComprar', filtros.diasSinComprar);
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiFetch(`/clientes/segmentacion${query}`, { token });
}

// ---------- Billetera de créditos de campaña ----------
export function fetchBilletera(token) {
  return apiFetch('/billetera', { token });
}
export function comprarCreditos(token, cantidad) {
  return apiFetch('/billetera/comprar', { method: 'POST', body: { cantidadCreditos: cantidad }, token });
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