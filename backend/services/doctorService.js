import state from '../data/store.js';
import { createErrorResponse } from '../utils/response.js';

export function getAllDoctors(query = {}) {
  let list = [...state.doctors];
  if (query.department) list = list.filter(d => d.department === query.department);
  if (query.available !== undefined) list = list.filter(d => d.available === String(query.available) === 'true');
  return list;
}

export function getDoctorById(id) {
  return state.doctors.find(d => d.id === id) || null;
}

export function getDoctorsByDepartment(departmentName) {
  return state.doctors.filter(d => d.department === departmentName && d.available);
}
