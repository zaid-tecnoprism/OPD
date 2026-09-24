import express from 'express';
import { createSuccessResponse } from '../utils/response.js';
import { getAllVisits, getVisitById, createVisit, updateVisit, updateVisitStatus, getVisitsByPatient, getLatestCompletedVisit } from '../services/visitService.js';
import { getPatientById } from '../services/patientService.js';
import { getPrescriptionByVisit } from '../services/prescriptionService.js';

const router = express.Router();

router.post('/', (req, res, next) => {
  try {
    const visit = createVisit(req.body);
    res.status(201).json(createSuccessResponse(visit, 'Visit created', 201));
  } catch (e) { next(e); }
});

router.get('/', (req, res, next) => {
  try {
    const list = getAllVisits(req.query);
    res.json(createSuccessResponse(list));
  } catch (e) { next(e); }
});

router.get('/:id/tests', (req, res, next) => {
  try {
    const v = getVisitById(req.params.id);
    if (!v) return res.status(404).json({ success: false, error: { code: 'VISIT_NOT_FOUND', message: 'Visit not found' } });
    const p = getPrescriptionByVisit(req.params.id);
    res.json(createSuccessResponse({
      visit: v,
      prescribedTests: p ? p.tests : []
    }));
  } catch (e) { next(e); }
});

router.get('/:id', (req, res, next) => {
  try {
    const v = getVisitById(req.params.id);
    if (!v) return res.status(404).json({ success: false, error: { code: 'VISIT_NOT_FOUND', message: 'Visit not found' } });
    const patient = getPatientById(v.patientId);
    res.json(createSuccessResponse({ ...v, patient }));
  } catch (e) { next(e); }
});

router.put('/:id', (req, res, next) => {
  try {
    const v = updateVisit(req.params.id, req.body);
    res.json(createSuccessResponse(v, 'Visit updated'));
  } catch (e) { next(e); }
});

router.put('/:id/status', (req, res, next) => {
  try {
    const v = updateVisitStatus(req.params.id, req.body.status);
    res.json(createSuccessResponse(v, 'Visit status updated'));
  } catch (e) { next(e); }
});

export default router;
