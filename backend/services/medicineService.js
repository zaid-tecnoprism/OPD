import state from '../data/store.js';
import { createErrorResponse } from '../utils/response.js';
import { uuid } from '../data/store.js';

export function getAllMedicines(query = {}) {
  let list = [...state.medicines];
  if (query.search) {
    const s = query.search.toLowerCase();
    list = list.filter(m => m.name.toLowerCase().includes(s) || m.category.toLowerCase().includes(s));
  }
  if (query.category) list = list.filter(m => m.category === query.category);
  return list;
}

export function getMedicineById(id) {
  return state.medicines.find(m => m.id === id) || null;
}

export function createMedicine(data) {
  const m = {
    id: data.id || uuid(),
    name: data.name,
    category: data.category || 'General',
    price: Number(data.price) || 0,
    gstPercent: Number(data.gstPercent) || 0,
    stockQuantity: Number(data.stockQuantity) || 0,
    unit: data.unit || 'unit'
  };
  state.medicines.push(m);
  return m;
}

export function updateMedicine(id, data) {
  const m = getMedicineById(id);
  if (!m) throw createErrorResponse('MEDICINE_NOT_FOUND', 'Medicine not found', 404);
  Object.assign(m, {
    name: data.name || m.name,
    category: data.category || m.category,
    price: data.price !== undefined ? Number(data.price) : m.price,
    gstPercent: data.gstPercent !== undefined ? Number(data.gstPercent) : m.gstPercent,
    stockQuantity: data.stockQuantity !== undefined ? Number(data.stockQuantity) : m.stockQuantity,
    unit: data.unit || m.unit
  });
  return m;
}

export function updateInventory(medicineId, qtyChange, reason = 'update') {
  const m = getMedicineById(medicineId);
  if (!m) throw createErrorResponse('MEDICINE_NOT_FOUND', 'Medicine not found', 404);
  const newQty = m.stockQuantity + qtyChange;
  if (newQty < 0) {
    throw createErrorResponse('INSUFFICIENT_STOCK', `Insufficient stock for ${m.name}. Available: ${m.stockQuantity}`, 400);
  }
  m.stockQuantity = newQty;
  return { medicine: m, change: qtyChange, reason, timestamp: new Date().toISOString() };
}

export function getInventoryStatus() {
  return state.medicines.map(m => ({
    id: m.id,
    name: m.name,
    category: m.category,
    price: m.price,
    gstPercent: m.gstPercent,
    stockQuantity: m.stockQuantity,
    unit: m.unit,
    lowStock: m.stockQuantity < 50
  }));
}
