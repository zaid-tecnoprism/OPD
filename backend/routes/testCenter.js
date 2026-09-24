import express from 'express';
import { createSuccessResponse } from '../utils/response.js';
import { getAllTestTransactions, getPendingTestsForPatient, confirmTest } from '../services/testCenterService.js';
import { getLatestCompletedVisit, getVisitsByPatient } from '../services/visitService.js';
import { getPrescriptionByVisit } from '../services/prescriptionService.js';
import { getPatientById, findPatientByMobile } from '../services/patientService.js';

const router = express.Router();

router.get('/transactions', (req, res, next) => {
  try {
    res.json(createSuccessResponse(getAllTestTransactions(req.query)));
  } catch (e) { next(e); }
});

router.get('/lookup', (req, res, next) => {
  try {
    const { patientId, mobile } = req.query;
    let patient = null;
    if (patientId) patient = getPatientById(patientId);
    else if (mobile) patient = findPatientByMobile(mobile);
    if (!patient) return res.status(404).json({ success: false, error: { code: 'PATIENT_NOT_FOUND', message: 'Patient not found' } });

    const visits = getVisitsByPatient(patient.id);
    const completedVisits = visits.filter(v => v.visitStatus === 'completed');
    const latest = getLatestCompletedVisit(patient.id);
    const testData = completedVisits.map(v => {
      const p = getPrescriptionByVisit(v.id);
      if (!p || p.tests.length === 0) return null;
      const confirmed = getAllTestTransactions({ visitId: v.id, status: 'confirmed' });
      const confirmedIds = new Set(confirmed.map(ct => ct.testId));
      return {
        visit: v,
        tests: p.tests.map(t => ({
          ...t,
          confirmed: confirmedIds.has(t.testId),
          confirmTx: confirmed.find(c => c.testId === t.testId) || null
        })),
        prescriptionId: p.id
      };
    }).filter(Boolean);

    res.json(createSuccessResponse({
      patient,
      latestCompletedVisit: latest,
      allCompletedVisits: completedVisits,
      testPrescriptions: testData
    }));
  } catch (e) { next(e); }
});

router.post('/confirm', (req, res, next) => {
  try {
    const tx = confirmTest(req.body);
    res.status(201).json(createSuccessResponse(tx, 'Test confirmed successfully', 201));
  } catch (e) { next(e); }
});

export default router;
