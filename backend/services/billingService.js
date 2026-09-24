import state, { uuid } from '../data/store.js';
import { createErrorResponse, calculateGST } from '../utils/response.js';
import { getPrescriptionByVisit } from './prescriptionService.js';
import { getMedicineById } from './medicineService.js';
import { getTestById } from './testService.js';
import { getVisitById, updateVisit } from './visitService.js';

export function getBillById(id) {
  return state.bills.find(b => b.id === id) || null;
}

export function getBillsByPatient(patientId) {
  return state.bills
    .filter(b => b.patientId === patientId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getBillByVisit(visitId) {
  return state.bills.find(b => b.visitId === visitId) || null;
}

export function buildBillCharges({ prescription, dispensedMedicines = [], confirmedTests = [] }) {
  const charges = [];
  let subtotal = 0;
  let gstTotal = 0;

  if (prescription && prescription.consultationFee > 0) {
    const fee = Number(prescription.consultationFee.toFixed(2));
    const gst = calculateGST(fee, 5);
    charges.push({
      type: 'consultation',
      description: 'Consultation Fee',
      base: fee,
      gstPercent: 5,
      gst,
      total: Number((fee + gst).toFixed(2))
    });
    subtotal += fee;
    gstTotal += gst;
  }

  for (const d of dispensedMedicines) {
    const med = d.medicineId ? getMedicineById(d.medicineId) : null;
    const unitPrice = med ? med.price : (d.unitPrice || 0);
    const gstPct = med ? med.gstPercent : 12;
    const qty = Number(d.quantity) || 1;
    const base = Number((unitPrice * qty).toFixed(2));
    const gst = calculateGST(base, gstPct);
    charges.push({
      type: 'medicine',
      medicineId: d.medicineId,
      description: d.name,
      quantity: qty,
      unitPrice,
      base,
      gstPercent: gstPct,
      gst,
      total: Number((base + gst).toFixed(2))
    });
    subtotal += base;
    gstTotal += gst;
  }

  for (const ct of confirmedTests) {
    const t = ct.testId ? getTestById(ct.testId) : null;
    const price = t ? t.price : (ct.price || 0);
    const gstPct = t ? t.gstPercent : 5;
    const gst = calculateGST(price, gstPct);
    charges.push({
      type: 'test',
      testId: ct.testId,
      description: ct.name,
      base: price,
      gstPercent: gstPct,
      gst,
      total: Number((price + gst).toFixed(2))
    });
    subtotal += price;
    gstTotal += gst;
  }

  return {
    charges,
    subtotal: Number(subtotal.toFixed(2)),
    gstTotal: Number(gstTotal.toFixed(2)),
    total: Number((subtotal + gstTotal).toFixed(2))
  };
}

export function generateBill({ patientId, visitId, force = true }) {
  const existing = getBillByVisit(visitId);
  if (existing && existing.paymentStatus === 'paid') return existing;

  const visit = getVisitById(visitId);
  if (!visit) throw createErrorResponse('VISIT_NOT_FOUND', 'Visit not found', 404);

  const prescription = getPrescriptionByVisit(visitId);
  if (!prescription) throw createErrorResponse('PRESCRIPTION_NOT_FOUND', 'Prescription not found for this visit. Complete consultation first.', 400);

  const dispensed = state.pharmacyTransactions.filter(t => t.visitId === visitId && t.status === 'dispensed');
  const confirmed = state.testTransactions.filter(t => t.visitId === visitId && t.status === 'confirmed');

  const dispensedMeds = dispensed.map(d => ({
    medicineId: d.medicineId,
    name: d.medicineName,
    quantity: d.quantity,
    unitPrice: d.unitPrice
  }));
  const confirmedTests = confirmed.map(ct => ({
    testId: ct.testId,
    name: ct.testName,
    price: ct.price
  }));

  const { charges, subtotal, gstTotal, total } = buildBillCharges({
    prescription,
    dispensedMedicines: dispensedMeds,
    confirmedTests
  });

  if (existing && force && existing.paymentStatus !== 'paid') {
    existing.charges = charges;
    existing.subtotal = subtotal;
    existing.gstTotal = gstTotal;
    existing.total = total;
    existing.updatedAt = new Date().toISOString();
    return existing;
  }
  if (existing) return existing;

  const bill = {
    id: uuid(),
    patientId,
    visitId,
    charges,
    subtotal,
    gstTotal,
    total,
    paymentStatus: 'pending',
    createdAt: new Date().toISOString()
  };
  state.bills.push(bill);
  return bill;
}

export function payBill(billId) {
  const bill = getBillById(billId);
  if (!bill) throw createErrorResponse('BILL_NOT_FOUND', 'Bill not found', 404);
  if (bill.paymentStatus === 'paid') throw createErrorResponse('ALREADY_PAID', 'Bill already paid', 409);
  bill.paymentStatus = 'paid';
  bill.paidAt = new Date().toISOString();
  return bill;
}
