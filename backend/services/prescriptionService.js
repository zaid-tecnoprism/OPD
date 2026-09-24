import state, { uuid } from '../data/store.js';
import { createErrorResponse, validateRequiredFields, calculateGST } from '../utils/response.js';
import { getMedicineById } from './medicineService.js';
import { getTestById } from './testService.js';

export function getPrescriptionByVisit(visitId) {
  return state.prescriptions.find(p => p.visitId === visitId) || null;
}

export function getPrescriptionById(id) {
  return state.prescriptions.find(p => p.id === id) || null;
}

export function getPrescriptionsByPatient(patientId) {
  return state.prescriptions
    .filter(p => p.patientId === patientId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function createPrescription(data) {
  const err = validateRequiredFields(data, ['patientId', 'visitId', 'doctorId', 'diagnosis']);
  if (err) throw err;

  if (getPrescriptionByVisit(data.visitId)) {
    throw createErrorResponse('PRESCRIPTION_EXISTS', 'Prescription already exists for this visit', 409);
  }

  const meds = Array.isArray(data.medicines) ? data.medicines : [];
  const tests = Array.isArray(data.tests) ? data.tests : [];

  const p = {
    id: uuid(),
    patientId: data.patientId,
    visitId: data.visitId,
    doctorId: data.doctorId,
    diagnosis: data.diagnosis,
    medicines: meds.map(m => ({
      medicineId: m.medicineId || null,
      name: m.name,
      dosage: m.dosage || '',
      frequency: m.frequency || '',
      duration: m.duration || '',
      quantity: Number(m.quantity) || 1,
      instructions: m.instructions || ''
    })),
    tests: tests.map(t => ({
      testId: t.testId || null,
      name: t.name
    })),
    doctorNotes: data.doctorNotes || '',
    consultationFee: Number(data.consultationFee) || 0,
    createdAt: data.createdAt || new Date().toISOString()
  };

  state.prescriptions.push(p);
  return p;
}

export function calculateMedicineCosts(prescription) {
  const items = [];
  let subtotal = 0;
  let gstTotal = 0;

  for (const m of prescription.medicines) {
    const med = m.medicineId ? getMedicineById(m.medicineId) : null;
    const unitPrice = med ? med.price : 0;
    const gstPct = med ? med.gstPercent : 12;
    const qty = Number(m.quantity) || 1;
    const base = Number((unitPrice * qty).toFixed(2));
    const gst = calculateGST(base, gstPct);
    subtotal += base;
    gstTotal += gst;
    items.push({
      type: 'medicine',
      medicineId: m.medicineId,
      name: m.name,
      quantity: qty,
      unitPrice,
      gstPercent: gstPct,
      base,
      gst,
      total: Number((base + gst).toFixed(2))
    });
  }
  return { items, subtotal, gstTotal, total: Number((subtotal + gstTotal).toFixed(2)) };
}

export function calculateTestCosts(prescription) {
  const items = [];
  let subtotal = 0;
  let gstTotal = 0;

  for (const t of prescription.tests) {
    const test = t.testId ? getTestById(t.testId) : null;
    const price = test ? test.price : 0;
    const gstPct = test ? test.gstPercent : 5;
    const gst = calculateGST(price, gstPct);
    subtotal += price;
    gstTotal += gst;
    items.push({
      type: 'test',
      testId: t.testId,
      name: t.name,
      unitPrice: price,
      gstPercent: gstPct,
      base: price,
      gst,
      total: Number((price + gst).toFixed(2))
    });
  }
  return { items, subtotal, gstTotal, total: Number((subtotal + gstTotal).toFixed(2)) };
}
