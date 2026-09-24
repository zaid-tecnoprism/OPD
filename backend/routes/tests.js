import express from 'express';
import { createSuccessResponse } from '../utils/response.js';
import { getAllTests, getTestById, createTest } from '../services/testService.js';
import { getVisitById } from '../services/visitService.js';
import { getPrescriptionByVisit } from '../services/prescriptionService.js';

const router = express.Router();

router.get('/', (req, res, next) => {
  try {
    res.json(createSuccessResponse(getAllTests(req.query)));
  } catch (e) { next(e); }
});

router.get('/visits/:visitId/tests', (req, res, next) => {
  try {
    const v = getVisitById(req.params.visitId);
    if (!v) return res.status(404).json({ success: false, error: { code: 'VISIT_NOT_FOUND', message: 'Visit not found' } });
    const p = getPrescriptionByVisit(req.params.visitId);
    res.json(createSuccessResponse({
      visit: v,
      prescribedTests: p ? p.tests : []
    }));
  } catch (e) { next(e); }
});

router.post('/', (req, res, next) => {
  try {
    const t = createTest(req.body);
    res.status(201).json(createSuccessResponse(t, 'Test created', 201));
  } catch (e) { next(e); }
});

router.get('/:id', (req, res, next) => {
  try {
    const t = getTestById(req.params.id);
    if (!t) return res.status(404).json({ success: false, error: { code: 'TEST_NOT_FOUND', message: 'Test not found' } });
    res.json(createSuccessResponse(t));
  } catch (e) { next(e); }
});

export default router;
