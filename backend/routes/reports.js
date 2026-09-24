import express from 'express';
import { createSuccessResponse } from '../utils/response.js';
import { dailyBillingReconciliation, dailyQueueReport, autoGenerateMissingBills } from '../services/reportService.js';

const router = express.Router();

router.get('/daily-billing-reconciliation', (req, res, next) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const report = dailyBillingReconciliation(date);
    res.json(createSuccessResponse(report, 'Daily billing reconciliation report'));
  } catch (e) { next(e); }
});

router.get('/daily-queue-report', (req, res, next) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const report = dailyQueueReport(date);
    res.json(createSuccessResponse(report, 'Daily queue report'));
  } catch (e) { next(e); }
});

router.post('/auto-generate-missing-bills', (req, res, next) => {
  try {
    const result = autoGenerateMissingBills();
    res.json(createSuccessResponse(result, `Auto-generated ${result.generated} missing bills`));
  } catch (e) { next(e); }
});

export default router;
