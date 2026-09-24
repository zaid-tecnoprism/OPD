import express from 'express';
import { createSuccessResponse } from '../utils/response.js';
import { getAllMedicines, getMedicineById, createMedicine, updateMedicine, getInventoryStatus, updateInventory } from '../services/medicineService.js';

const router = express.Router();

router.get('/inventory', (req, res, next) => {
  try {
    res.json(createSuccessResponse(getInventoryStatus()));
  } catch (e) { next(e); }
});

router.post('/inventory/:medicineId/update', (req, res, next) => {
  try {
    const { qtyChange, reason } = req.body;
    const result = updateInventory(req.params.medicineId, Number(qtyChange), reason);
    res.json(createSuccessResponse(result, 'Inventory updated'));
  } catch (e) { next(e); }
});

router.get('/', (req, res, next) => {
  try {
    res.json(createSuccessResponse(getAllMedicines(req.query)));
  } catch (e) { next(e); }
});

router.post('/', (req, res, next) => {
  try {
    const m = createMedicine(req.body);
    res.status(201).json(createSuccessResponse(m, 'Medicine created', 201));
  } catch (e) { next(e); }
});

router.put('/:id', (req, res, next) => {
  try {
    const m = updateMedicine(req.params.id, req.body);
    res.json(createSuccessResponse(m, 'Medicine updated'));
  } catch (e) { next(e); }
});

router.get('/:id', (req, res, next) => {
  try {
    const m = getMedicineById(req.params.id);
    if (!m) return res.status(404).json({ success: false, error: { code: 'MEDICINE_NOT_FOUND', message: 'Medicine not found' } });
    res.json(createSuccessResponse(m));
  } catch (e) { next(e); }
});

export default router;
