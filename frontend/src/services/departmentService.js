import api from './apiClient';

export const departmentService = {
  getAll: () => api.get('/departments').then(r => r.data),
  getById: (id) => api.get(`/departments/${id}`).then(r => r.data)
};
