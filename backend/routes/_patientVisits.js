import express from 'express';
import { createSuccessResponse } from '../utils/response.js';
import { getAllVisits, getVisitsByPatient, getLatestCompletedVisit } from '../services/visitService.js';

const router = express.Router();

router.get('/:id/visits', (req, res, next) => {
  try {
    const visits = getVisitsByPatient(req.params.id);
    const latest = getLatestCompletedVisit(req.params.id);
    res.json(createSuccessResponse({ visits, latestCompletedVisit: latest, count: visits.length }));
  } catch (e) { next(e); }
});

export default router;
