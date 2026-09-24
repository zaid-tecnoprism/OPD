import express from 'express';
import { createSuccessResponse } from '../utils/response.js';
import { getAllPharmacyTransactions, getPendingForPatient, dispenseMedicine } from '../services/pharmacyService.js';
import { getLatestCompletedVisit, getVisitsByPatient } from '../services/visitService.js';
import { getPrescriptionByVisit } from '../services/prescriptionService.js';
import { getPatientById, findPatientByMobile } from '../services/patientService.js';

const router = express.Router();

router.get('/transactions', (req, res, next) => {
  try {
    res.json(createSuccessResponse(getAllPharmacyTransactions(req.query)));
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
    const prescriptions = completedVisits.map(v => {
      const p = getPrescriptionByVisit(v.id);
      if (!p) return null;
      const dispensed = getAllPharmacyTransactions({ visitId: v.id, status: 'dispensed' });
      const dispensedIds = new Set(dispensed.map(d => d.medicineId));
      return {
        visit: v,
        prescription: p,
        medicines: p.medicines.map(m => ({
          ...m,
          dispensed: dispensedIds.has(m.medicineId),
          dispenseTx: dispensed.find(d => d.medicineId === m.medicineId) || null
        })),
        tests: p.tests
      };
    }).filter(Boolean);

    res.json(createSuccessResponse({
      patient,
      latestCompletedVisit: latest,
      allCompletedVisits: completedVisits,
      prescriptions
    }));
  } catch (e) { next(e); }
});

router.post('/dispense', (req, res, next) => {
  try {
    const tx = dispenseMedicine(req.body);
    res.status(201).json(createSuccessResponse(tx, 'Medicine dispensed successfully', 201));
  } catch (e) { next(e); }
});

export default router;
