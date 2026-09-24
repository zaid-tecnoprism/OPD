import express from 'express';
import { createSuccessResponse } from '../utils/response.js';
import { getPrescriptionByVisit, createPrescription, getPrescriptionsByPatient } from '../services/prescriptionService.js';

const router = express.Router();

router.post('/', (req, res, next) => {
  try {
    const p = createPrescription(req.body);
    res.status(201).json(createSuccessResponse(p, 'Prescription created', 201));
  } catch (e) { next(e); }
});

router.get('/visit/:visitId', (req, res, next) => {
  try {
    const p = getPrescriptionByVisit(req.params.visitId);
    if (!p) return res.status(404).json({ success: false, error: { code: 'PRESCRIPTION_NOT_FOUND', message: 'No prescription for this visit' } });
    res.json(createSuccessResponse(p));
  } catch (e) { next(e); }
});

router.get('/patient/:patientId', (req, res, next) => {
  try {
    res.json(createSuccessResponse(getPrescriptionsByPatient(req.params.patientId)));
  } catch (e) { next(e); }
});

export default router;
