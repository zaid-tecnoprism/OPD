import api from './apiClient';

export const tokenService = {
  create: (data) => api.post('/tokens', data).then(r => r.data),
  getAll: (params) => api.get('/tokens', { params }).then(r => r.data),
  getByToken: (token) => api.get(`/tokens/${token}`).then(r => r.data),
  updateStatus: (token, status) =>
    api.put(`/tokens/${token}/status`, { status }).then(r => r.data)
};
