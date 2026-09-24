import api from './apiClient';

export const doctorService = {
  getAll: (params) => api.get('/doctors', { params }).then(r => r.data),
  getById: (id) => api.get(`/doctors/${id}`).then(r => r.data)
};
