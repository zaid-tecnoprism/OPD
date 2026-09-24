import state from '../data/store.js';
import { createErrorResponse } from '../utils/response.js';

export function getAllDepartments() {
  return [...state.departments];
}

export function getDepartmentById(id) {
  return state.departments.find(d => d.id === id) || null;
}

export function getDepartmentByName(name) {
  return state.departments.find(d => d.name.toLowerCase() === name.toLowerCase()) || null;
}

export function getDepartmentByPrefix(prefix) {
  return state.departments.find(d => d.tokenPrefix === prefix) || null;
}
