import express from 'express';
import { createSuccessResponse } from '../utils/response.js';
import { getAllDepartments, getDepartmentById } from '../services/departmentService.js';

const router = express.Router();

router.get('/', (req, res, next) => {
  try {
    res.json(createSuccessResponse(getAllDepartments()));
  } catch (e) { next(e); }
});

router.get('/:id', (req, res, next) => {
  try {
    const d = getDepartmentById(req.params.id);
    if (!d) return res.status(404).json({ success: false, error: { code: 'DEPARTMENT_NOT_FOUND', message: 'Department not found' } });
    res.json(createSuccessResponse(d));
  } catch (e) { next(e); }
});

export default router;
