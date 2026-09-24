import express from 'express';
import { createSuccessResponse } from '../utils/response.js';
import { getBillById, getBillsByPatient, generateBill, payBill, getBillByVisit } from '../services/billingService.js';
import { generateBillPDF } from '../utils/pdfGenerator.js';
import { getPatientById } from '../services/patientService.js';
import { getVisitById } from '../services/visitService.js';

const router = express.Router();

router.post('/generate', (req, res, next) => {
  try {
    const { patientId, visitId } = req.body;
    const bill = generateBill({ patientId, visitId });
    res.status(201).json(createSuccessResponse(bill, 'Bill generated', 201));
  } catch (e) { next(e); }
});

router.get('/:id', (req, res, next) => {
  try {
    const b = getBillById(req.params.id);
    if (!b) return res.status(404).json({ success: false, error: { code: 'BILL_NOT_FOUND', message: 'Bill not found' } });
    const patient = b.patientId ? getPatientById(b.patientId) : null;
    const visit = b.visitId ? getVisitById(b.visitId) : null;
    res.json(createSuccessResponse({ ...b, patient, visit }));
  } catch (e) { next(e); }
});

router.get('/patient/:patientId', (req, res, next) => {
  try {
    res.json(createSuccessResponse(getBillsByPatient(req.params.patientId)));
  } catch (e) { next(e); }
});

router.post('/:id/pay', (req, res, next) => {
  try {
    const b = payBill(req.params.id);
    res.json(createSuccessResponse(b, 'Payment successful'));
  } catch (e) { next(e); }
});

router.get('/:id/pdf', async (req, res, next) => {
  try {
    const b = getBillById(req.params.id);
    if (!b) return res.status(404).json({ success: false, error: { code: 'BILL_NOT_FOUND', message: 'Bill not found' } });
    const patient = b.patientId ? getPatientById(b.patientId) : null;
    const visit = b.visitId ? getVisitById(b.visitId) : null;
    const pdf = await generateBillPDF({ bill: b, patient, visit });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="bill_${b.id}.pdf"`);
    res.send(pdf);
  } catch (e) { next(e); }
});

export default router;
