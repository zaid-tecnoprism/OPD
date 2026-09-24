import api, { API_BASE } from './apiClient';

export const billingService = {
  generate: (patientId, visitId) =>
    api.post('/bills/generate', { patientId, visitId }).then(r => r.data),
  getById: (id) => api.get(`/bills/${id}`).then(r => r.data),
  getByPatient: (patientId) => api.get(`/bills/patient/${patientId}`).then(r => r.data),
  pay: (id) => api.post(`/bills/${id}/pay`).then(r => r.data),
  pdfUrl: (id) => `${API_BASE}/bills/${id}/pdf`
};
