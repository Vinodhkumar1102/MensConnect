import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('admin_token');
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
