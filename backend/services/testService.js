import state from '../data/store.js';
import { createErrorResponse } from '../utils/response.js';
import { uuid } from '../data/store.js';

export function getAllTests(query = {}) {
  let list = [...state.tests];
  if (query.search) {
    const s = query.search.toLowerCase();
    list = list.filter(t => t.name.toLowerCase().includes(s));
  }
  return list;
}

export function getTestById(id) {
  return state.tests.find(t => t.id === id) || null;
}

export function createTest(data) {
  const t = {
    id: data.id || uuid(),
    name: data.name,
    price: Number(data.price) || 0,
    gstPercent: Number(data.gstPercent) || 0,
    description: data.description || ''
  };
  state.tests.push(t);
  return t;
}
