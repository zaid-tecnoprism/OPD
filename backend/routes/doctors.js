import express from 'express';
import { createSuccessResponse } from '../utils/response.js';
import { getAllDoctors, getDoctorById } from '../services/doctorService.js';

const router = express.Router();

router.get('/', (req, res, next) => {
  try {
    const list = getAllDoctors(req.query);
    res.json(createSuccessResponse(list));
  } catch (e) { next(e); }
});

router.get('/:id', (req, res, next) => {
  try {
    const d = getDoctorById(req.params.id);
    if (!d) return res.status(404).json({ success: false, error: { code: 'DOCTOR_NOT_FOUND', message: 'Doctor not found' } });
    res.json(createSuccessResponse(d));
  } catch (e) { next(e); }
});

export default router;
