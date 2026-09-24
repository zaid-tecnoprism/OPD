import api from './apiClient';

export const testService = {
  getAll: (params) => api.get('/tests', { params }).then(r => r.data),
  getById: (id) => api.get(`/tests/${id}`).then(r => r.data),
  create: (data) => api.post('/tests', data).then(r => r.data),
  lookup: (params) => api.get('/test-center/lookup', { params }).then(r => r.data),
  confirm: (data) => api.post('/test-center/confirm', data).then(r => r.data),
  getTransactions: (params) => api.get('/test-center/transactions', { params }).then(r => r.data)
};
