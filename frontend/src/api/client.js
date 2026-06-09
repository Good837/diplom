import axios from 'axios';

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

const api = axios.create({
  baseURL: API_URL,
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  if (config.auth) {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    delete config.auth;
  }
  return config;
});

function toApiError(error) {
  const data = error.response?.data;
  const message =
    (data && (data.error || data.message)) || error.message || 'Сталася помилка під час запиту до сервера';
  const err = new Error(message);
  err.status = error.response?.status;
  err.data = data;
  return err;
}

export async function apiFetch(path, { method = 'GET', body, auth = false, headers = {} } = {}) {
  try {
    const finalHeaders = { ...headers };
    if (body !== undefined) {
      finalHeaders['Content-Type'] = 'application/json; charset=utf-8';
    }
    const res = await api.request({
      url: path,
      method,
      data: body,
      auth,
      headers: finalHeaders,
    });
    return res.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function apiFetchFormData(path, { method = 'POST', formData, auth = false, headers = {} } = {}) {
  try {
    const res = await api.request({
      url: path,
      method,
      data: formData,
      auth,
      headers,
    });
    return res.data;
  } catch (error) {
    throw toApiError(error);
  }
}
