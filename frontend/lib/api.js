// Server components run inside the frontend container, where localhost is
// the frontend itself. Use Docker's backend service name for server requests;
// browser requests go through nginx so they work without CORS.
const API_BASE_URL =
  typeof window === 'undefined'
    ? process.env.INTERNAL_API_BASE_URL || 'http://backend:4000/api'
    : process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with status ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getArticles: (params = '') => request(`/news${params}`),
  getArticle: (id) => request(`/news/${id}`),
  getDigest: () => request('/news/digest/today'),
  search: (q) => request(`/news/search?q=${encodeURIComponent(q)}`),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email, password, name) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }),
};
