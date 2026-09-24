import axios from 'axios';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    console.error('[API ERROR]', err?.config?.url, err?.message);
    const payload = err?.response?.data || {
      success: false,
      error: { code: 'NETWORK_ERROR', message: err.message || 'Network error' }
    };
    return Promise.reject(payload);
  }
);

export default api;
export const API_BASE = BASE;
