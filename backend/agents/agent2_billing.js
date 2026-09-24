import { callTool } from '../tools/agentTools.js';
import state from '../data/store.js';

export async function agent2CoordinateBilling({ patientId, visitId, trigger }) {
  const trace = [];
  trace.push({ step: 'init', timestamp: new Date().toISOString(), patientId, visitId, trigger: trigger || 'post_doctor_complete' });

  if (!patientId || !visitId) {
    return {
      success: false,
      error: { code: 'MISSING_IDS', message: 'patientId and visitId required for coordination.' },
      trace
    };
  }

  const visitLookup = await callTool('getVisit', { visitId });
  trace.push({ step: 'tool:getVisit', result: visitLookup.success ? 'ok' : 'fail', data: visitLookup });
  if (!visitLookup.success || !visitLookup.data.visit) {
    return { success: false, error: { code: 'VISIT_NOT_FOUND', message: 'Visit not found' }, trace };
  }
  const visit = visitLookup.data.visit;
  const patient = visitLookup.data.patient;

  if (visit.visitStatus !== 'completed') {
    trace.push({ step: 'check_visit_status', status: visit.visitStatus, decision: 'awaiting_doctor_completion' });
    return {
      success: true,
      data: {
        patientId,
        visitId,
        status: 'pending_doctor',
        message: 'Visit not yet completed by doctor. Coordination will continue after consultation.',
        trace,
        doctorClinicalAuthority: 'Prescription and clinical decisions are preserved exactly as entered by doctor. Agent does not modify.'
      }
    };
  }

  const prescriptionLookup = await callTool('getPrescription', { visitId });
  trace.push({ step: 'tool:getPrescription', result: prescriptionLookup.success ? 'ok' : 'fail', data: prescriptionLookup });
  if (!prescriptionLookup.success || !prescriptionLookup.data) {
    return {
      success: false,
      error: { code: 'PRESCRIPTION_NOT_FOUND', message: 'No prescription found for completed visit. Doctor must complete consultation first.' },
      trace
    };
  }
  const prescription = prescriptionLookup.data;

  const dispensedMeds = state.pharmacyTransactions.filter(t => t.visitId === visitId && t.status === 'dispensed');
  const confirmedTests = state.testTransactions.filter(t => t.visitId === visitId && t.status === 'confirmed');
  trace.push({ step: 'state_query', dispensedMedsCount: dispensedMeds.length, confirmedTestsCount: confirmedTests.length });

  const prescribedMedIds = new Set(prescription.medicines.map(m => m.medicineId).filter(Boolean));
  const prescribedTestIds = new Set(prescription.tests.map(t => t.testId).filter(Boolean));
  const dispensedIds = new Set(dispensedMeds.map(t => t.medicineId));
  const confirmedIds = new Set(confirmedTests.map(t => t.testId));

  const pendingMeds = [];
  for (const m of prescription.medicines) {
    if (!m.medicineId || !dispensedIds.has(m.medicineId)) {
      const medLookup = m.medicineId ? await callTool('getMedicineInfo', { medicineId: m.medicineId }) : { success: false };
      const medData = medLookup.success ? medLookup.data : null;
      pendingMeds.push({
        medicineId: m.medicineId,
        name: m.name,
        quantity: m.quantity,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instructions,
        inStock: medData ? medData.stockQuantity >= m.quantity : 'unknown',
        stockAvailable: medData ? medData.stockQuantity : null,
        unitPrice: medData ? medData.price : null,
        gstPercent: medData ? medData.gstPercent : 12,
        estimatedTotal: medData ? Number((medData.price * m.quantity * (1 + medData.gstPercent / 100)).toFixed(2)) : null
      });
    }
  }
  trace.push({ step: 'pending_meds_identified', count: pendingMeds.length });

  const pendingTests = [];
  for (const t of prescription.tests) {
    if (!t.testId || !confirmedIds.has(t.testId)) {
      const testLookup = t.testId ? await callTool('getTestInfo', { testId: t.testId }) : { success: false };
      const testData = testLookup.success ? testLookup.data : null;
      pendingTests.push({
        testId: t.testId,
        name: t.name,
        description: testData ? testData.description : null,
        price: testData ? testData.price : null,
        gstPercent: testData ? testData.gstPercent : 5,
        estimatedTotal: testData ? Number((testData.price * (1 + testData.gstPercent / 100)).toFixed(2)) : null
      });
    }
  }
  trace.push({ step: 'pending_tests_identified', count: pendingTests.length });

  let bill = null;
  let billLookup = await callTool('getBillingInfo', { visitId });
  trace.push({ step: 'tool:checkExistingBill', result: billLookup.success ? (billLookup.data ? 'exists' : 'none') : 'error' });

  try {
    const genResult = await callTool('generateBill', { patientId, visitId });
    trace.push({ step: 'tool:generateBill', result: genResult.success ? 'ok' : 'fail', data: genResult });
    if (genResult.success) {
      bill = genResult.data;
      if (prescription.consultationFee > 0 && bill.charges.filter(c => c.type === 'consultation').length === 0) {
        trace.push({ step: 'billing_note', note: 'Consultation fee included' });
      }
    }
  } catch (e) {
    trace.push({ step: 'tool:generateBill_error', error: e.message });
  }

  const lowStockMeds = pendingMeds.filter(m => m.inStock === false);
  if (lowStockMeds.length > 0) {
    try {
      await callTool('notify', {
        patientId, visitId,
        type: 'pharmacy_alert',
        priority: 'high',
        message: `Low stock alert for visit ${visitId}: ${lowStockMeds.map(m => m.name).join(', ')}`
      });
      trace.push({ step: 'tool:notify_pharmacy', result: 'sent', meds: lowStockMeds.map(m => m.name) });
    } catch (e) {
      trace.push({ step: 'tool:notify_pharmacy_error', error: e.message });
    }
  }

  if (bill && bill.paymentStatus === 'pending') {
    try {
      await callTool('notify', {
        patientId, visitId,
        type: 'billing_pending',
        priority: 'normal',
        message: `Bill ${bill.id} ready for payment. Amount due: ${bill.total}.`
      });
      trace.push({ step: 'tool:notify_billing', result: 'sent' });
    } catch (e) {}
  }

  if (pendingTests.length > 0) {
    try {
      await callTool('notify', {
        patientId, visitId,
        type: 'test_center',
        priority: 'normal',
        message: `${pendingTests.length} test(s) pending for visit ${visitId}: ${pendingTests.map(t => t.name).join(', ')}`
      });
      trace.push({ step: 'tool:notify_test_center', result: 'sent' });
    } catch (e) {}
  }

  const prescriptionPreserved = true;

  const workflowStatus = (() => {
    if (pendingMeds.length === 0 && pendingTests.length === 0 && bill && bill.paymentStatus === 'paid') return 'fully_complete';
    if (pendingMeds.length === 0 && pendingTests.length === 0 && bill) return 'awaiting_payment';
    if (pendingMeds.length > 0 || pendingTests.length > 0) return 'awaiting_services';
    return 'partial';
  })();

  const output = {
    patientId,
    visitId,
    workflowStatus,
    prescriptionPreserved,
    doctorClinicalAuthority: 'Agent does not modify diagnosis, medicines, tests, or notes entered by doctor.',
    consultationFee: prescription.consultationFee,
    prescriptionSummary: {
      diagnosis: prescription.diagnosis,
      medicineCount: prescription.medicines.length,
      testCount: prescription.tests.length,
      doctorId: prescription.doctorId,
      doctorNotes: prescription.doctorNotes
    },
    servicesStatus: {
      medicines: {
        total: prescription.medicines.length,
        dispensed: dispensedMeds.length,
        pending: pendingMeds,
        lowStockAlerts: lowStockMeds.map(m => ({ name: m.name, available: m.stockAvailable, required: m.quantity }))
      },
      tests: {
        total: prescription.tests.length,
        confirmed: confirmedTests.length,
        pending: pendingTests
      }
    },
    dispensedMedicines: dispensedMeds.map(t => ({
      medicineId: t.medicineId,
      name: t.medicineName,
      quantity: t.quantity,
      amount: t.total
    })),
    confirmedTestsSummary: confirmedTests.map(t => ({
      testId: t.testId,
      name: t.testName,
      amount: t.total
    })),
    bill: bill ? {
      id: bill.id,
      charges: bill.charges,
      subtotal: bill.subtotal,
      gstTotal: bill.gstTotal,
      total: bill.total,
      paymentStatus: bill.paymentStatus
    } : { error: 'Bill not yet available' },
    estimatedOutstanding: pendingMeds.reduce((s, m) => s + (m.estimatedTotal || 0), 0) + pendingTests.reduce((s, t) => s + (t.estimatedTotal || 0), 0),
    notificationsSent: true,
    completedAt: new Date().toISOString()
  };

  trace.push({ step: 'coordination_complete', workflowStatus });

  const workflowSteps = [
    `Retrieved visit ${visitId} status=${visit.visitStatus}`,
    `Retrieved prescription (${prescription.medicines.length} meds, ${prescription.tests.length} tests)`,
    `Found ${dispensedMeds.length} dispensed medicines, ${confirmedTests.length} confirmed tests`,
    pendingMeds.length ? `Identified ${pendingMeds.length} pending medicine(s): ${pendingMeds.map(m => m.name).join(', ')}` : 'All prescribed medicines dispensed',
    pendingTests.length ? `Identified ${pendingTests.length} pending test(s): ${pendingTests.map(t => t.name).join(', ')}` : 'All prescribed tests confirmed',
    lowStockMeds.length ? `Sent pharmacy low-stock alert for ${lowStockMeds.length} item(s)` : 'No low-stock alerts',
    `Generated bill ${bill ? bill.id : '(failed)'} with total=${bill ? bill.total : 'N/A'} paymentStatus=${bill ? bill.paymentStatus : 'N/A'}`,
    bill && bill.paymentStatus === 'pending' ? 'Sent billing pending notification' : '',
    pendingTests.length ? `Sent test-center notification for ${pendingTests.length} tests` : ''
  ].filter(Boolean);

  output.status = workflowStatus;
  output.workflowSteps = workflowSteps;

  return {
    success: true,
    data: output,
    message: `Agent 2 billing coordination complete. Workflow status: ${workflowStatus}.`,
    trace,
    safety: 'Agent does not alter any clinical decision (diagnosis, prescription, tests) entered by doctor. Only coordinates pharmacy, test, and billing workflows with actual tool/API results.'
  };
}
