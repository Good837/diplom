const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000/api';

const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

export function resolveAssetUrl(url) {
  if (!url) return '';
  const raw = String(url);
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return `${API_ORIGIN}${raw}`;
  return `${API_ORIGIN}/${raw}`;
}

function getToken() {
  return localStorage.getItem('tastyhub_token');
}

export function setToken(token) {
  if (!token) localStorage.removeItem('tastyhub_token');
  else localStorage.setItem('tastyhub_token', token);
}

export async function apiFetch(path, { method = 'GET', body, auth = false, headers = {} } = {}) {
  const finalHeaders = {
    Accept: 'application/json',
    ...headers,
  };

  if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json; charset=utf-8';
  }

  if (auth) {
    const token = getToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // ignore non-json
  }

  if (!res.ok) {
    const message = (data && (data.error || data.message)) || 'Сталася помилка під час запиту до сервера';
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export async function apiFetchFormData(path, { method = 'POST', formData, auth = false, headers = {} } = {}) {
  const finalHeaders = {
    Accept: 'application/json',
    ...headers,
  };

  // IMPORTANT: do not set Content-Type for FormData; the browser will add boundary.
  if (auth) {
    const token = getToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: formData,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // ignore non-json
  }

  if (!res.ok) {
    const message = (data && (data.error || data.message)) || 'Сталася помилка під час запиту до сервера';
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

