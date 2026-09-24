import state, { uuid } from '../data/store.js';
import { createErrorResponse } from '../utils/response.js';
import { getMedicineById, updateInventory } from './medicineService.js';
import { getPrescriptionByVisit } from './prescriptionService.js';
import { getLatestCompletedVisit, getVisitsByPatient } from './visitService.js';

export function getAllPharmacyTransactions(query = {}) {
  let list = [...state.pharmacyTransactions];
  if (query.patientId) list = list.filter(t => t.patientId === query.patientId);
  if (query.visitId) list = list.filter(t => t.visitId === query.visitId);
  if (query.status) list = list.filter(t => t.status === query.status);
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getPendingForPatient(patientId) {
  const visits = getVisitsByPatient(patientId);
  const result = [];
  for (const v of visits) {
    const p = getPrescriptionByVisit(v.id);
    if (!p || p.medicines.length === 0) continue;
    const dispensedForVisit = state.pharmacyTransactions.filter(t => t.visitId === v.id && t.status === 'dispensed');
    const dispensedIds = new Set(dispensedForVisit.map(t => t.medicineId));
    const pending = p.medicines.filter(m => !dispensedIds.has(m.medicineId));
    if (pending.length > 0) {
      result.push({ visit: v, prescription: p, pendingMedicines: pending, dispensedMedicines: dispensedForVisit });
    }
  }
  return result;
}

export function dispenseMedicine({ patientId, visitId, medicineId, quantity, dispensedBy = 'pharmacy' }) {
  const med = getMedicineById(medicineId);
  if (!med) throw createErrorResponse('MEDICINE_NOT_FOUND', 'Medicine not found', 404);

  const qty = Number(quantity) || 1;
  if (med.stockQuantity < qty) {
    throw createErrorResponse('INSUFFICIENT_STOCK', `Insufficient stock for ${med.name}. Available: ${med.stockQuantity}, Requested: ${qty}`, 400);
  }

  const prescription = getPrescriptionByVisit(visitId);
  const prescMed = prescription ? prescription.medicines.find(m => m.medicineId === medicineId) : null;
  if (prescMed && qty > Number(prescMed.quantity)) {
    throw createErrorResponse('QUANTITY_EXCEEDS_PRESCRIPTION', `Quantity exceeds prescribed amount. Prescribed: ${prescMed.quantity}`, 400);
  }

  const already = state.pharmacyTransactions.find(t => t.visitId === visitId && t.medicineId === medicineId && t.status === 'dispensed');
  if (already) throw createErrorResponse('ALREADY_DISPENSED', 'This medicine has already been dispensed for this visit', 409);

  updateInventory(medicineId, -qty, 'dispense');

  const unitPrice = med.price;
  const base = Number((unitPrice * qty).toFixed(2));
  const gst = Number((base * med.gstPercent / 100).toFixed(2));

  const tx = {
    id: uuid(),
    patientId,
    visitId,
    medicineId,
    medicineName: med.name,
    quantity: qty,
    unitPrice,
    gstPercent: med.gstPercent,
    base,
    gst,
    total: Number((base + gst).toFixed(2)),
    status: 'dispensed',
    dispensedBy,
    instructions: prescMed ? `${prescMed.dosage} ${prescMed.frequency} for ${prescMed.duration}` : '',
    createdAt: new Date().toISOString()
  };
  state.pharmacyTransactions.push(tx);
  return tx;
}
