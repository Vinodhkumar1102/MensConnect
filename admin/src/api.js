import axios from 'axios';

// Use Vite env variable `VITE_API_BASE` in production, fall back to the Render URL.
const API_BASE = import.meta.env.VITE_API_BASE || 'https://mensconnect.onrender.com';
const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  try {
    let token = null;
    try { token = localStorage.getItem('admin_token'); } catch (e) {}
    if (!token) {
      try { token = sessionStorage.getItem('admin_token'); } catch (e) {}
    }
    if (token) config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
  } catch (e) {
    // ignore
  }
  return config;
});

export default api;

export function loginAdmin(credentials) {
  return api.post('/api/admin/login', credentials);
}
