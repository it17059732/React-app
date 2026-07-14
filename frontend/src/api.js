const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL ?? 'http://localhost:3000';

async function request(path, options = {}) {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await res.json() : null;
  if (!res.ok) {
    const message = (body && body.error) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body;
}

export const api = {
  health: () => request('/health'),

  getUsers: () => request('/api/users/users'),
  createUser: (data) => request('/api/users/users', { method: 'POST', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/api/users/users/${id}`, { method: 'DELETE' }),

  getProducts: () => request('/api/products/products'),
  createProduct: (data) => request('/api/products/products', { method: 'POST', body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/api/products/products/${id}`, { method: 'DELETE' }),

  getOrders: () => request('/api/orders/orders'),
  createOrder: (data) => request('/api/orders/orders', { method: 'POST', body: JSON.stringify(data) })
};

export { GATEWAY_URL };
