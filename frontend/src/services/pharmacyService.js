import api from './apiClient';

export const pharmacyService = {
  getAllMedicines: (params) => api.get('/medicines', { params }).then(r => r.data),
  getMedicineById: (id) => api.get(`/medicines/${id}`).then(r => r.data),
  createMedicine: (data) => api.post('/medicines', data).then(r => r.data),
  updateMedicine: (id, data) => api.put(`/medicines/${id}`, data).then(r => r.data),
  getInventory: () => api.get('/medicines/inventory').then(r => r.data),
  updateInventory: (medicineId, qtyChange, reason) =>
    api.post(`/medicines/inventory/${medicineId}/update`, { qtyChange, reason }).then(r => r.data),
  lookup: (params) => api.get('/pharmacy/lookup', { params }).then(r => r.data),
  dispense: (data) => api.post('/pharmacy/dispense', data).then(r => r.data),
  getTransactions: (params) => api.get('/pharmacy/transactions', { params }).then(r => r.data)
};
