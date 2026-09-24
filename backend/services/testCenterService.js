import state, { uuid } from '../data/store.js';
import { createErrorResponse } from '../utils/response.js';
import { getTestById } from './testService.js';
import { getPrescriptionByVisit } from './prescriptionService.js';
import { getVisitsByPatient } from './visitService.js';

export function getAllTestTransactions(query = {}) {
  let list = [...state.testTransactions];
  if (query.patientId) list = list.filter(t => t.patientId === query.patientId);
  if (query.visitId) list = list.filter(t => t.visitId === query.visitId);
  if (query.status) list = list.filter(t => t.status === query.status);
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getPendingTestsForPatient(patientId) {
  const visits = getVisitsByPatient(patientId);
  const result = [];
  for (const v of visits) {
    const p = getPrescriptionByVisit(v.id);
    if (!p || p.tests.length === 0) continue;
    const confirmed = state.testTransactions.filter(t => t.visitId === v.id && t.status === 'confirmed');
    const confirmedIds = new Set(confirmed.map(t => t.testId));
    const pending = p.tests.filter(t => !confirmedIds.has(t.testId));
    if (pending.length > 0) {
      result.push({ visit: v, prescription: p, pendingTests: pending, confirmedTests: confirmed });
    }
  }
  return result;
}

export function confirmTest({ patientId, visitId, testId, confirmedBy = 'test-center' }) {
  const test = getTestById(testId);
  if (!test) throw createErrorResponse('TEST_NOT_FOUND', 'Test not found', 404);

  const prescription = getPrescriptionByVisit(visitId);
  if (prescription) {
    const hasTest = prescription.tests.find(t => t.testId === testId);
    if (!hasTest) throw createErrorResponse('TEST_NOT_PRESCRIBED', 'This test was not prescribed for this visit', 400);
  }

  const already = state.testTransactions.find(t => t.visitId === visitId && t.testId === testId && t.status === 'confirmed');
  if (already) throw createErrorResponse('ALREADY_CONFIRMED', 'This test has already been confirmed for this visit', 409);

  const price = test.price;
  const gst = Number((price * test.gstPercent / 100).toFixed(2));

  const tx = {
    id: uuid(),
    patientId,
    visitId,
    testId,
    testName: test.name,
    description: test.description,
    price,
    gstPercent: test.gstPercent,
    base: price,
    gst,
    total: Number((price + gst).toFixed(2)),
    status: 'confirmed',
    confirmedBy,
    createdAt: new Date().toISOString()
  };
  state.testTransactions.push(tx);
  return tx;
}
