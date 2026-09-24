import state from '../data/store.js';
import { getVisitsByPatient } from './visitService.js';
import { getPrescriptionByVisit, calculateMedicineCosts, calculateTestCosts } from './prescriptionService.js';
import { getAllPharmacyTransactions } from './pharmacyService.js';
import { getAllTestTransactions } from './testCenterService.js';
import { generateBill, getBillByVisit } from './billingService.js';
import { addNotification } from '../utils/audit.js';

export function dailyBillingReconciliation(date = new Date()) {
  const targetDate = new Date(date).toDateString();
  const completedVisits = state.visits.filter(v => {
    const d = new Date(v.visitDate).toDateString();
    return d === targetDate && v.visitStatus === 'completed';
  });

  const report = {
    date: new Date(date).toISOString().split('T')[0],
    generatedAt: new Date().toISOString(),
    totalCompletedVisits: completedVisits.length,
    expectedCharges: [],
    actualCharges: [],
    discrepancies: [],
    missingBills: [],
    summary: {
      expectedTotal: 0,
      actualTotal: 0,
      discrepancyAmount: 0,
      missingBillCount: 0,
      paidCount: 0,
      pendingCount: 0
    }
  };

  for (const visit of completedVisits) {
    const prescription = getPrescriptionByVisit(visit.id);
    if (!prescription) {
      report.discrepancies.push({
        visitId: visit.id,
        patientId: visit.patientId,
        type: 'NO_PRESCRIPTION',
        message: 'Completed visit has no prescription'
      });
      continue;
    }

    const medCosts = calculateMedicineCosts(prescription);
    const testCosts = calculateTestCosts(prescription);
    const consultFee = prescription.consultationFee || 0;
    const consultGst = Number((consultFee * 5 / 100).toFixed(2));

    const expectedTotal = medCosts.total + testCosts.total + consultFee + consultGst;
    report.expectedCharges.push({
      visitId: visit.id,
      patientId: visit.patientId,
      consultation: consultFee,
      consultationGst: consultGst,
      medicines: medCosts.total,
      tests: testCosts.total,
      total: Number(expectedTotal.toFixed(2))
    });
    report.summary.expectedTotal += expectedTotal;

    const dispensed = state.pharmacyTransactions.filter(t => t.visitId === visit.id && t.status === 'dispensed');
    const confirmed = state.testTransactions.filter(t => t.visitId === visit.id && t.status === 'confirmed');

    const actualMedTotal = dispensed.reduce((s, t) => s + t.total, 0);
    const actualTestTotal = confirmed.reduce((s, t) => s + t.total, 0);
    const actualConsult = consultFee + consultGst;
    const actualTotal = actualMedTotal + actualTestTotal + actualConsult;

    report.actualCharges.push({
      visitId: visit.id,
      patientId: visit.patientId,
      consultation: actualConsult,
      medicines: actualMedTotal,
      tests: actualTestTotal,
      total: Number(actualTotal.toFixed(2))
    });
    report.summary.actualTotal += actualTotal;

    const diff = Number((expectedTotal - actualTotal).toFixed(2));
    if (Math.abs(diff) > 0.01) {
      report.discrepancies.push({
        visitId: visit.id,
        patientId: visit.patientId,
        type: 'CHARGE_MISMATCH',
        expected: Number(expectedTotal.toFixed(2)),
        actual: Number(actualTotal.toFixed(2)),
        difference: diff,
        message: diff > 0 ? 'Expected charges higher than actual (missing services?)' : 'Actual higher than expected'
      });
      report.summary.discrepancyAmount += diff;
    }

    const bill = getBillByVisit(visit.id);
    if (!bill) {
      report.missingBills.push({
        visitId: visit.id,
        patientId: visit.patientId,
        expectedTotal: Number(expectedTotal.toFixed(2))
      });
      report.summary.missingBillCount++;
    } else if (bill.paymentStatus === 'paid') {
      report.summary.paidCount++;
    } else {
      report.summary.pendingCount++;
    }
  }

  report.summary.expectedTotal = Number(report.summary.expectedTotal.toFixed(2));
  report.summary.actualTotal = Number(report.summary.actualTotal.toFixed(2));
  report.summary.discrepancyAmount = Number(report.summary.discrepancyAmount.toFixed(2));

  return report;
}

export function dailyQueueReport(date = new Date()) {
  const targetDate = new Date(date).toDateString();
  const todaysVisits = state.visits.filter(v => {
    const d = new Date(v.visitDate).toDateString();
    return d === targetDate;
  });
  const todaysTokens = state.tokens.filter(t => {
    const d = new Date(t.createdAt).toDateString();
    return d === targetDate;
  });

  const byDept = {};
  for (const dept of state.departments) {
    byDept[dept.name] = {
      department: dept.name,
      tokenPrefix: dept.tokenPrefix,
      total: 0,
      pending: 0,
      called: 0,
      inConsultation: 0,
      completed: 0,
      cancelled: 0,
      priorityCount: 0,
      priorityPending: 0
    };
  }

  for (const token of todaysTokens) {
    if (!byDept[token.department]) continue;
    const d = byDept[token.department];
    d.total++;
    if (token.priority !== 'routine') d.priorityCount++;
    switch (token.status) {
      case 'pending':
        d.pending++;
        if (token.priority !== 'routine') d.priorityPending++;
        break;
      case 'called': d.called++; break;
      case 'in consultation': d.inConsultation++; break;
      case 'completed': d.completed++; break;
      case 'cancelled': d.cancelled++; break;
    }
  }

  const summary = {
    date: new Date(date).toISOString().split('T')[0],
    generatedAt: new Date().toISOString(),
    totalVisits: todaysVisits.length,
    totalTokens: todaysTokens.length,
    pending: todaysTokens.filter(t => t.status === 'pending').length,
    called: todaysTokens.filter(t => t.status === 'called').length,
    inConsultation: todaysTokens.filter(t => t.status === 'in consultation').length,
    completed: todaysTokens.filter(t => t.status === 'completed').length,
    cancelled: todaysTokens.filter(t => t.status === 'cancelled').length,
    priorityTotal: todaysTokens.filter(t => t.priority !== 'routine').length,
    priorityPending: todaysTokens.filter(t => t.priority !== 'routine' && t.status === 'pending').length,
    served: todaysTokens.filter(t => t.status === 'completed').length,
    departments: Object.values(byDept)
  };

  return summary;
}

export function autoGenerateMissingBills() {
  const completedVisits = state.visits.filter(v => v.visitStatus === 'completed' && !getBillByVisit(v.id));
  const generated = [];
  const errors = [];
  for (const v of completedVisits) {
    try {
      const bill = generateBill({ patientId: v.patientId, visitId: v.id });
      generated.push(bill);
    } catch (e) {
      errors.push({ visitId: v.id, patientId: v.patientId, error: e.message });
    }
  }
  if (generated.length > 0) {
    addNotification({
      type: 'billing',
      message: `Auto-generated ${generated.length} missing bills`,
      priority: generated.length > 5 ? 'high' : 'normal'
    });
  }
  return { generated: generated.length, errors };
}
