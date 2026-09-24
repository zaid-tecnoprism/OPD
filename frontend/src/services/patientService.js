import api from './apiClient';

export const patientService = {
  getAll: (params) => api.get('/patients', { params }).then(r => r.data),
  getById: (id) => api.get(`/patients/${id}`).then(r => r.data),
  getByMobile: (mobile) => api.get('/patients', { params: { mobile } }).then(r => r.data),
  create: (data) => api.post('/patients', data).then(r => r.data),
  update: (id, data) => api.put(`/patients/${id}`, data).then(r => r.data),
  getVisits: (id) => api.get(`/patients/${id}/visits`).then(r => r.data)
};
