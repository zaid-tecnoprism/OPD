import express from 'express';
import { createSuccessResponse } from '../utils/response.js';
import { getAllPatients, getPatientById, findPatientByMobile, createPatient, updatePatient } from '../services/patientService.js';
import { getAllVisits, getVisitsByPatient, getLatestCompletedVisit } from '../services/visitService.js';

const router = express.Router();

router.post('/', (req, res, next) => {
  try {
    const patient = createPatient(req.body);
    res.status(201).json(createSuccessResponse(patient, 'Patient registered successfully', 201));
  } catch (e) { next(e); }
});

router.get('/', (req, res, next) => {
  try {
    if (req.query.mobile) {
      const p = findPatientByMobile(req.query.mobile);
      if (!p) return res.status(404).json({ success: false, error: { code: 'PATIENT_NOT_FOUND', message: 'No patient with that mobile' } });
      return res.json(createSuccessResponse(p));
    }
    const list = getAllPatients(req.query);
    res.json(createSuccessResponse(list));
  } catch (e) { next(e); }
});

router.get('/:id/visits', (req, res, next) => {
  try {
    const visits = getVisitsByPatient(req.params.id);
    const latest = getLatestCompletedVisit(req.params.id);
    res.json(createSuccessResponse({ visits, latestCompletedVisit: latest, count: visits.length }));
  } catch (e) { next(e); }
});

router.get('/:id', (req, res, next) => {
  try {
    const p = getPatientById(req.params.id);
    if (!p) return res.status(404).json({ success: false, error: { code: 'PATIENT_NOT_FOUND', message: 'Patient not found' } });
    res.json(createSuccessResponse(p));
  } catch (e) { next(e); }
});

router.put('/:id', (req, res, next) => {
  try {
    const p = updatePatient(req.params.id, req.body);
    res.json(createSuccessResponse(p, 'Patient updated'));
  } catch (e) { next(e); }
});

export default router;
