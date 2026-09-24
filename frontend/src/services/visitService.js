import api from './apiClient';

export const visitService = {
  getAll: (params) => api.get('/visits', { params }).then(r => r.data),
  getById: (id) => api.get(`/visits/${id}`).then(r => r.data),
  create: (data) => api.post('/visits', data).then(r => r.data),
  update: (id, data) => api.put(`/visits/${id}`, data).then(r => r.data),
  updateStatus: (id, status) => api.put(`/visits/${id}/status`, { status }).then(r => r.data),
  getTests: (id) => api.get(`/visits/${id}/tests`).then(r => r.data)
};
