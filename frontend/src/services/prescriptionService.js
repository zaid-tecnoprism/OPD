import api from './apiClient';

export const prescriptionService = {
  create: (data) => api.post('/prescriptions', data).then(r => r.data),
  getByVisit: (visitId) => api.get(`/prescriptions/visit/${visitId}`).then(r => r.data),
  getByPatient: (patientId) => api.get(`/prescriptions/patient/${patientId}`).then(r => r.data)
};
